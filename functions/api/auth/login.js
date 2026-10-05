import { hashPassword, randomHex, json, setCookie, safeUser } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const { email, password, securityAnswer } = await request.json();
  if (!email || !password) return json({ error: 'Email and password are required' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE LOWER(email) = ?')
    .bind(email.toLowerCase().trim()).first();
  if (!user) return json({ error: 'Invalid credentials' }, 401);

  // Verify password (auto-upgrade PLAIN: bootstrap admin)
  let valid = false;
  if (user.password_hash.startsWith('PLAIN:')) {
    valid = user.password_hash === 'PLAIN:' + password;
    if (valid) {
      const newSalt = randomHex(16);
      const newHash = await hashPassword(password, newSalt);
      await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?')
        .bind(newHash, newSalt, user.id).run();
      user.password_hash = newHash;
      user.password_salt = newSalt;
    }
  } else {
    valid = (await hashPassword(password, user.password_salt)) === user.password_hash;
  }
  if (!valid) return json({ error: 'Invalid credentials' }, 401);

  if (!user.verified) {
    return json({ error: 'Please verify your account first', needsVerification: true, email: user.email }, 403);
  }

  // Security question challenge
  if (user.security_question && !securityAnswer) {
    return json({
      needsSecurityAnswer: true,
      securityQuestion: user.security_question,
      email: user.email
    });
  }
  if (user.security_question && securityAnswer) {
    const computed = await hashPassword(securityAnswer.toLowerCase().trim(), user.security_answer_salt);
    if (computed !== user.security_answer_hash) {
      return json({
        error: 'Incorrect security answer',
        needsSecurityAnswer: true,
        securityQuestion: user.security_question
      }, 401);
    }
  }

  const token = randomHex(32);
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 7;
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, user.id, expires).run();

  return json({ ok: true, user: safeUser(user) }, 200, { 'Set-Cookie': setCookie(token) });
}