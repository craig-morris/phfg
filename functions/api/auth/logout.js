import { json } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/session=([a-f0-9]+)/);
  if (m) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(m[1]).run();
  return json({ ok: true }, 200, { 'Set-Cookie': 'session=; Path=/; Max-Age=0' });
}