import { json, hashPassword, randomHex, setCookie } from '../_utils.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Invalid JSON' }, 400); }

    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, 400);
    }

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!user) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    // Use your utils hash function
    const typedHash = await hashPassword(password, user.password_salt);

    if (typedHash !== user.password_hash) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    // randomHex ensures the cookie passes your /session=([a-f0-9]+)/ regex
    const token = randomHex(32); 
    
    // Expiration must be a timestamp in milliseconds
    const expiresAtMs = Date.now() + (7 * 24 * 60 * 60 * 1000);

    // Store session in DB
    await env.DB.prepare(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, token, expiresAtMs).run();

    // Use your utils cookie setter
    return json({
      ok: true,
      token: token,
      role: user.role,
      force_password_change: user.force_password_change === 1 
    }, 200, { 'Set-Cookie': setCookie(token) });

  } catch (err) {
    return json({ error: 'Login error: ' + err.message }, 500);
  }
}
