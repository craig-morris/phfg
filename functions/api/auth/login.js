import { json } from '../../_utils.js'; // Adjust path if needed

// MUST MATCH THE EXACT FUNCTION IN YOUR ADMIN PATCH
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

    // 1. Get the user from D1
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!user) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    // 2. Hash the typed password using the user's stored salt
    const typedHash = await hashPassword(password, user.password_salt);

    // 3. Compare the hashes
    if (typedHash !== user.password_hash) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    // 4. Generate a session token (You likely have a utility for this)
    // For this example, we'll generate a random string. 
    // You should replace this with your actual JWT or D1 session insert logic.
    const token = crypto.randomUUID(); 
    
    // If you store sessions in D1:
    // await env.DB.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').bind(user.id, token).run();

    // 5. Return success and the force_password_change flag
    return json({
      ok: true,
      token: token,
      role: user.role,
      // SQLite stores booleans as 1 or 0. We convert it to a real boolean for the frontend.
      force_password_change: user.force_password_change === 1 
    });

  } catch (err) {
    return json({ error: 'Login error: ' + err.message }, 500);
  }
}
