import { json } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const { email, code } = await request.json();
  if (!email || !code) return json({ error: 'Email and code are required' }, 400);

  const user = await env.DB.prepare('SELECT id, verification_code FROM users WHERE LOWER(email) = ?')
    .bind(email.toLowerCase().trim()).first();

  if (!user) return json({ error: 'Account not found' }, 404);
  if (!user.verification_code) return json({ error: 'Already verified' }, 400);
  if (user.verification_code !== String(code).trim()) return json({ error: 'Invalid verification code' }, 400);

  await env.DB.prepare('UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?')
    .bind(user.id).run();

  return json({ ok: true });
}