import { json } from '../_utils.js';

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", key);
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    const typedHash = await hashPassword(password, user.password_salt);

    if (typedHash !== user.password_hash) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    const token = crypto.randomUUID(); 
    
    // Calculate Expiration Date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); 
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // Store session in DB
    await env.DB.prepare(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, token, expiresAtStr).run();

    // ==========================================
    // NEW: Set the Cookie Header
    // ==========================================
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    // We set an HttpOnly cookie named 'session'. 
    // Adjust the name 'session' if your _utils.js expects a different cookie name (e.g., 'token', 'auth')
    headers.append('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);

    return new Response(JSON.stringify({
      ok: true,
      token: token,
      role: user.role,
      force_password_change: user.force_password_change === 1 
    }), { status: 200, headers });

  } catch (err) {
    return json({ error: 'Login error: ' + err.message }, 500);
  }
}
