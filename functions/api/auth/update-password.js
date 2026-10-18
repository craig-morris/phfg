import { json, hashPassword, randomHex } from '../_utils.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized. Missing token.' }, 401);
    }
    const token = authHeader.split(' ')[1];

    const session = await env.DB.prepare(`
      SELECT users.id, users.email 
      FROM sessions 
      JOIN users ON sessions.user_id = users.id 
      WHERE sessions.token = ?
    `).bind(token).first();

    if (!session) {
      return json({ error: 'Invalid or expired session.' }, 401);
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Invalid JSON' }, 400); }

    const newPassword = String(body.newPassword || '').trim();

    if (newPassword.length < 8) {
      return json({ error: 'Password must be at least 8 characters long.' }, 400);
    }

    // Use the utils functions
    const newSalt = randomHex(16);
    const newHash = await hashPassword(newPassword, newSalt);

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
