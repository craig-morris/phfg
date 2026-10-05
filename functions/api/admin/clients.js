import { json, requireAdmin, hashPassword, randomHex } from '../_utils.js';

export async function onRequestGet(context) {
  try {
    const { error } = await requireAdmin(context);
    if (error) return error;

    const { results } = await context.env.DB.prepare(
      `SELECT id, email, full_name, phone, address,
              awarded_amount, allocated_winnings, report_details,
              funds_locked, lock_reason,
              site_notes, created_at, verified
       FROM users WHERE role = 'client' ORDER BY id DESC`
    ).all();

    return json({ clients: results });
  } catch (err) {
    return json({ error: 'Clients GET: ' + (err && err.message || String(err)) }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { error } = await requireAdmin(context);
    if (error) return error;

    const {
      email, password, fullName, phone, address,
      awardedAmount, allocatedWinnings, reportDetails,
      securityQuestion, securityAnswer, fundsLocked, lockReason
    } = await request.json();

    if (!email || !password) return json({ error: 'Email and password are required' }, 400);
    if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

    const emailLc = email.toLowerCase().trim();
    const existing = await env.DB.prepare('SELECT id FROM users WHERE LOWER(email) = ?')
      .bind(emailLc).first();
    if (existing) return json({ error: 'Email already in use' }, 409);

    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);

    let answerHash = '';
    let answerSalt = '';
    if (securityQuestion && securityAnswer) {
      answerSalt = randomHex(16);
      answerHash = await hashPassword(securityAnswer.toLowerCase().trim(), answerSalt);
    }

    const result = await env.DB.prepare(
      `INSERT INTO users
        (email, password_hash, password_salt, full_name, phone, address,
         security_question, security_answer_hash, security_answer_salt,
         verified, role,
         awarded_amount, allocated_winnings, report_details,
         funds_locked, lock_reason, site_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'client', ?, ?, ?, ?, ?, '')`
    ).bind(
      emailLc, hash, salt,
      fullName || '', phone || '', address || '',
      securityQuestion || '', answerHash, answerSalt,
      Number(awardedAmount) || 0,
      Number(allocatedWinnings) || 0,
      reportDetails || '',
      fundsLocked ? 1 : 0,
      lockReason || ''
    ).run();

    return json({ ok: true, id: result.meta.last_row_id });
  } catch (err) {
    return json({ error: 'Clients POST: ' + (err && err.message || String(err)) }, 500);
  }
}