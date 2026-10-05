import { json, requireAuth, safeUser } from '../_utils.js';

export async function onRequestGet(context) {
  try {
    const { error } = await requireAuth(context);
    if (error) return error;
    const user = await context.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind((await requireAuth(context)).user.id).first();
    return json({ user: safeUser(user) });
  } catch (err) {
    return json({ error: 'Profile GET: ' + (err && err.message || String(err)) }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { user, error } = await requireAuth(context);
    if (error) return error;

    const { fullName, phone, address } = await request.json();
    await env.DB.prepare(
      'UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?'
    ).bind(fullName || '', phone || '', address || '', user.id).run();

    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Profile POST: ' + (err && err.message || String(err)) }, 500);
  }
}