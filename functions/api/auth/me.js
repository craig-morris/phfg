import { json, getSession, safeUser } from '../_utils.js';

export async function onRequestGet(context) {
  try {
    const user = await getSession(context);
    if (!user) return json({ error: 'Not authenticated' }, 401);
    return json({ user: safeUser(user) });
  } catch (err) {
    return json({ error: 'Me: ' + (err && err.message || String(err)) }, 500);
  }
}