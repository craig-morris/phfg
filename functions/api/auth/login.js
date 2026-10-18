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

    // Use the exact hash function from _utils.js
    const typedHash = await hashPassword(password, user.password_salt);

    if (typedHash !== user.password_hash) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    // Generate hex token (matches your regex /session=([a-f0-9]+)/)
    const token = randomHex(32); 
    
    // Calculate Expiration (Date.now() + 7 days in milliseconds)
    // Your getSession checks against Date.now(), so it MUST be a number.
    const expiresAtMs = Date.now() + (7 * 24 * 60 * 60 * 1000);

    // Store session in DB
    await env.DB.prepare(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, token, expiresAtMs).run();

    // Use the exact cookie setter from _utils.js
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
