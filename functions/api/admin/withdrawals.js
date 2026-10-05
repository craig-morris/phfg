import { json, requireAdmin } from '../_utils.js';

export async function onRequestGet(context) {
  const { error } = await requireAdmin(context);
  if (error) return error;

  const { results } = await context.env.DB.prepare(
    `SELECT w.*, u.email AS user_email, u.full_name AS user_name
     FROM withdrawals w JOIN users u ON u.id = w.user_id
     ORDER BY w.id DESC`
  ).all();
  return json({ withdrawals: results });
}