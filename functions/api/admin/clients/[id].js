import { json, requireAdmin } from '../../_utils.js';

export async function onRequestGet(context) {
  try {
    const { params } = context;
    const { error } = await requireAdmin(context);
    if (error) return error;

    const row = await context.env.DB.prepare(
      `SELECT id, email, full_name, phone, address,
              awarded_amount, allocated_winnings, report_details,
              funds_locked, lock_reason,
              site_notes, verified, created_at
       FROM users WHERE id = ? AND role = 'client'`
    ).bind(params.id).first();

    if (!row) return json({ error: 'Client not found' }, 404);
    return json({ client: row });
  } catch (err) {
    return json({ error: 'GET: ' + (err && err.message ? err.message : String(err)) }, 500);
  }
}

export async function onRequestPatch(context) {
  let sql = null;
  let bind = null;
  try {
    const { params, request } = context;

    const { error } = await requireAdmin(context);
    if (error) return error;

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'Invalid JSON in request body' }, 400);
    }

    const allowed = [
      'full_name', 'phone', 'address',
      'awarded_amount', 'allocated_winnings', 'report_details',
      'funds_locked', 'lock_reason', 'site_notes',
      'email', 'verified'
    ];
    const fields = [];
    const values = [];

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
      if (key === 'funds_locked' || key === 'verified') v = v ? 1 : 0;
      if (key === 'report_details' || key === 'site_notes' || key === 'lock_reason') {
        v = String(v ?? '');
      }

      fields.push(`${key} = ?`);
      values.push(v);
    }

    if (!fields.length) return json({ error: 'No fields to update' }, 400);

    sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'client'`;
    bind = [...values, params.id];

    await context.env.DB.prepare(sql).bind(...bind).run();

    return json({ ok: true });
  } catch (err) {
    return json({
      error:  'PATCH: ' + (err && err.message ? err.message : String(err)),
      stack:  err && err.stack ? err.stack.split('\n').slice(0, 5) : null,
      sql,
      bind
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
    return json({ error: 'DELETE: ' + (err && err.message ? err.message : String(err)) }, 500);
  }
}
