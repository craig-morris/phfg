import { json, requireAuth } from '../_utils.js';

export async function onRequestGet(context) {
  try {
    const { user, error } = await requireAuth(context);
    if (error) return error;

    const { results } = await context.env.DB.prepare(
      'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC'
    ).bind(user.id).all();

    return json({ withdrawals: results });
  } catch (err) {
    return json({ error: 'Withdrawals GET: ' + (err && err.message || String(err)) }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { user, error } = await requireAuth(context);
    if (error) return error;

    if (user.funds_locked) {
      return json({ error: 'Withdrawals are currently locked', reason: user.lock_reason || '' }, 403);
    }

    const { amount, routingNumber, accountNumber, bankName } = await request.json();
    const amt = Number(amount);
    if (!amt || amt <= 0) return json({ error: 'Invalid amount' }, 400);
    if (amt > Number(user.awarded_amount || 0)) {
      return json({ error: 'Amount exceeds awarded balance' }, 400);
    }
    if (!/^\d{9}$/.test(String(routingNumber || ''))) {
      return json({ error: 'Routing number must be 9 digits' }, 400);
    }
    if (!/^\d{4,17}$/.test(String(accountNumber || ''))) {
      return json({ error: 'Account number must be 4–17 digits' }, 400);
    }

    const result = await env.DB.prepare(
      `INSERT INTO withdrawals (user_id, amount, routing_number, account_number, bank_name, status, progress)
       VALUES (?, ?, ?, ?, ?, 'pending', 10)`
    ).bind(user.id, amt, String(routingNumber), String(accountNumber), bankName || '').run();

    return json({ ok: true, id: result.meta.last_row_id });
  } catch (err) {
    return json({ error: 'Withdrawals POST: ' + (err && err.message || String(err)) }, 500);
  }
}