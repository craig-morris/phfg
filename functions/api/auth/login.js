import { json } from '../_utils.js'; // CHANGED PATH HERE

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

    // Generate session token (using crypto.randomUUID for simplicity here)
    const token = crypto.randomUUID(); 
    
    // Store session in DB
    await env.DB.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').bind(user.id, token).run();

    return json({
      ok: true,
      token: token,
      role: user.role,
      force_password_change: user.force_password_change === 1 
    });

  } catch (err) {
    return json({ error: 'Login error: ' + err.message }, 500);
  }
}
