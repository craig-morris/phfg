import { json, requireAdmin } from '../../_utils.js';

// ==========================================
// PASSWORD HASHING UTILITY (Web Crypto API)
// ==========================================
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", key);
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet(context) {
  try {
    const { params } = context;
    const { error } = await requireAdmin(context);
    if (error) return error;

    const row = await context.env.DB.prepare(
      `SELECT id, email, full_name, phone, address,
              awarded_amount, allocated_winnings, report_details,
              funds_locked, lock_reason,
              site_notes, verified, created_at,
              force_password_change 
       FROM users WHERE id = ? AND role = 'client'`
    ).bind(params.id).first();

    if (!row) return json({ error: 'Client not found' }, 404);
    return json({ client: row });
  } catch (err) {
    return json({ error: 'Client GET: ' + (err && err.message || String(err)) }, 500);
  }
}

export async function onRequestPatch(context) {
  let sql = null, bind = null;
  try {
    const { params, request } = context;
    const { error } = await requireAdmin(context);
    if (error) return error;

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Invalid JSON in request body' }, 400); }

    const allowed = [
      'full_name', 'phone', 'address',
      'awarded_amount', 'allocated_winnings', 'report_details',
      'funds_locked', 'lock_reason', 'site_notes',
      'email', 'verified', 'force_password_change'
    ];
    const fields = [], values = [];

    // 1. Process standard fields
    for (const key of allowed) {
      if (!(key in body)) continue;
      let v = body[key];

      if (key === 'email') {
        v = String(v ?? '').toLowerCase().trim();
        if (!v) continue;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          return json({ error: 'Invalid email: ' + v }, 400);
        }
      }
      if (key === 'awarded_amount' || key === 'allocated_winnings') v = Number(v) || 0;
      if (key === 'funds_locked' || key === 'verified' || key === 'force_password_change') v = v ? 1 : 0;
      if (key === 'report_details' || key === 'site_notes' || key === 'lock_reason') {
        v = String(v ?? '');
      }

      fields.push(`${key} = ?`);
      values.push(v);
    }

    // 2. Process Password Reset (if admin provided a new password)
    if (body.password && body.password.trim() !== '') {
      const salt = crypto.randomUUID(); // Generate a new random salt
      const hash = await hashPassword(body.password, salt); // Hash the new password
      
      // Push the hash and salt to the SQL update
      fields.push('password_hash = ?', 'password_salt = ?');
      values.push(hash, salt);
    }

    if (!fields.length) return json({ error: 'No fields to update' }, 400);

    sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'client'`;
    bind = [...values, params.id];

    await context.env.DB.prepare(sql).bind(...bind).run();
    return json({ ok: true });
  } catch (err) {
    return json({
      error: 'Client PATCH: ' + (err && err.message ? err.message : String(err)),
      stack: err && err.stack ? err.stack.split('\n').slice(0, 5) : null,
      sql, bind
    }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const { params } = context;
    const { error } = await requireAdmin(context);
    if (error) return error;

    await context.env.DB.batch([
      context.env.DB.prepare('DELETE FROM withdrawals WHERE user_id = ?').bind(params.id),
      context.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(params.id),
      context.env.DB.prepare("DELETE FROM users WHERE id = ? AND role = 'client'").bind(params.id)
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Client DELETE: ' + (err && err.message || String(err)) }, 500);
  }
}
