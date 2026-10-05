import { json, requireAdmin } from '../../_utils.js';

export async function onRequestPatch({ params, request, ...context }) {
  const { error } = await requireAdmin(context);
  if (error) return error;

  const { status, progress, note } = await request.json();
  const fields = [];
  const values = [];

  if (typeof status === 'string' && status) { fields.push('status = ?'); values.push(status); }
  if (typeof progress === 'number') {
    const p = Math.max(0, Math.min(100, Math.round(progress)));
    fields.push('progress = ?');
    values.push(p);
  }
  if (typeof note === 'string') { fields.push('note = ?'); values.push(note); }
  if (!fields.length) return json({ error: 'No fields to update' }, 400);

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(params.id);

  await context.env.DB.prepare(
    `UPDATE withdrawals SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  return json({ ok: true });
}