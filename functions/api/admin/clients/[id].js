import { json, requireAdmin } from '../../_utils.js';

export async function onRequestGet({ params, ...context }) {
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
}

export async function onRequestPatch({ params, request, ...context }) {
  const { error } = await requireAdmin(context);
  if (error) return error;

  const body = await request.json();
  const allowed = [
    'full_name', 'phone', 'address',
    'awarded_amount', 'allocated_winnings', 'report_details',
    'funds_locked', 'lock_reason', 'site_notes',
    'email', 'verified'
  ];
  const fields = [];
  const values = [];

  for (const key of allowed) {
    if (key in body) {
      fields.push(`${key} = ?`);
      let v = body[key];
      if (key === 'awarded_amount' || key === 'allocated_winnings') v = Number(v) || 0;
      if (key === 'funds_locked' || key === 'verified') v = v ? 1 : 0;
      if (key === 'email') v = String(v).toLowerCase().trim();
      if (key === 'report_details' || key === 'site_notes' || key === 'lock_reason') {
        v = String(v ?? '');
      }
      values.push(v);
    }
  }

  if (!fields.length) return json({ error: 'No fields to update' }, 400);

  values.push(params.id);
  await context.env.DB.prepare(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'client'`
  ).bind(...values).run();

  return json({ ok: true });
}

export async function onRequestDelete({ params, ...context }) {
  const { error } = await requireAdmin(context);
  if (error) return error;

  await context.env.DB.batch([
    context.env.DB.prepare('DELETE FROM withdrawals WHERE user_id = ?').bind(params.id),
    context.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(params.id),
    context.env.DB.prepare("DELETE FROM users WHERE id = ? AND role = 'client'").bind(params.id)
  ]);

  return json({ ok: true });
}