import { hashPassword, randomHex, json } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { email, password, fullName, phone, address, securityQuestion, securityAnswer } = body || {};

  if (!email || !password) return json({ error: 'Email and password are required' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

  const emailLc = email.toLowerCase().trim();
  const existing = await env.DB.prepare('SELECT id FROM users WHERE LOWER(email) = ?').bind(emailLc).first();
  if (existing) return json({ error: 'An account with that email already exists' }, 409);

  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);

  let answerHash = '';
  let answerSalt = '';
  if (securityQuestion && securityAnswer) {
    answerSalt = randomHex(16);
    answerHash = await hashPassword(securityAnswer.toLowerCase().trim(), answerSalt);
  }

  // 6-digit on-screen verification code
  const code = String(Math.floor(100000 + Math.random() * 900000));

  const result = await env.DB.prepare(
    `INSERT INTO users
      (email, password_hash, password_salt, full_name, phone, address,
       security_question, security_answer_hash, security_answer_salt,
       verification_code, verified, role, awarded_amount, funds_locked, site_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'client', 0, 1, '')`
  ).bind(
    emailLc, hash, salt,
    fullName || '', phone || '', address || '',
    securityQuestion || '', answerHash, answerSalt,
    code
  ).run();

  return json({
    ok: true,
    userId: result.meta.last_row_id,
    email: emailLc,
    verificationCode: code
  });
}