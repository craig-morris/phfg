import { json, requireAuth, safeUser } from '../_utils.js';

export async function onRequestGet(context) {
  const { user, error } = await requireAuth(context);
  if (error) return error;
  return json({ user: safeUser(user) });
}

export async function onRequestPost(context) {
  const { user, error } = await requireAuth(context);
  if (error) return error;

  const { fullName, phone, address } = await context.request.json();
  await context.env.DB.prepare(
    'UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?'
  ).bind(fullName || '', phone || '', address || '', user.id).run();

  return json({ ok: true });
}