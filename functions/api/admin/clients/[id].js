import { json, requireAdmin, hashPassword, randomHex } from '../../_utils.js';

export async function onRequestGet(context) {
  // ... (keep your existing GET route) ...
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

    // Use the utils functions for password reset
    if (body.password && body.password.trim() !== '') {
      const salt = randomHex(16); // From _utils.js
      const hash = await hashPassword(body.password, salt); // From _utils.js
      
      fields.push('password_hash = ?', 'password_salt = ?');
      values.push(hash, salt);
    }

    if (!fields.length) return json({ error: 'No fields to update' }, 400);

    sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'client'`;
    bind = [...values, params.id];

    await context.env.DB.prepare(sql).bind(...bind).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Client PATCH: ' + (err && err.message ? err.message : String(err)) }, 500);
  }
}

export async function onRequestDelete(context) {
  // ... (keep your existing DELETE route) ...
}
