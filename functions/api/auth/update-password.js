import { json } from '../../_utils.js';

// MUST MATCH THE EXACT FUNCTION IN YOUR LOGIN AND ADMIN PATCH ROUTES
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
    
    // 1. Get the temporary token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized. Missing token.' }, 401);
    }
    const token = authHeader.split(' ')[1];

    // 2. Verify the session token and get the user
    // (Adjust this query if your sessions table uses a different column name for the token)
    const session = await env.DB.prepare(`
      SELECT users.id, users.email 
      FROM sessions 
      JOIN users ON sessions.user_id = users.id 
      WHERE sessions.token = ?
    `).bind(token).first();

    if (!session) {
      return json({ error: 'Invalid or expired session.' }, 401);
    }

    // 3. Get the new password from the request body
    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Invalid JSON' }, 400); }

    const newPassword = String(body.newPassword || '').trim();

    if (newPassword.length < 8) {
      return json({ error: 'Password must be at least 8 characters long.' }, 400);
    }

    // 4. Generate a new salt and hash the new password
    const newSalt = crypto.randomUUID();
    const newHash = await hashPassword(newPassword, newSalt);

    // 5. Update the database and REMOVE the force_password_change flag
    await env.DB.prepare(`
      UPDATE users 
      SET password_hash = ?, password_salt = ?, force_password_change = 0 
      WHERE id = ?
    `).bind(newHash, newSalt, session.id).run();

    return json({ ok: true, message: 'Password updated successfully.' });

  } catch (err) {
    return json({ error: 'Update password error: ' + err.message }, 500);
  }
}
