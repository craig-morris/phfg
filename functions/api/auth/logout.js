import { json } from '../_utils.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const cookie = request.headers.get('Cookie') || '';
    const m = cookie.match(/session=([a-f0-9]+)/);
    if (m) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(m[1]).run();
    return json({ ok: true }, 200, { 'Set-Cookie': 'session=; Path=/; Max-Age=0' });
  } catch (err) {
    return json({ error: 'Logout: ' + (err && err.message || String(err)) }, 500);
  }
}