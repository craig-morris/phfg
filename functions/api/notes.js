import { json, requireAdmin } from './_utils.js';

export async function onRequestGet(context) {
  try {
    const row = await context.env.DB.prepare(
      'SELECT id, body, color, updated_at FROM notes WHERE visible = 1 ORDER BY id DESC LIMIT 1'
    ).first();
    return json({ note: row || null });
  } catch (err) {
    return json({ error: 'Notes GET: ' + (err && err.message || String(err)) }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { error } = await requireAdmin(context);
    if (error) return error;

    const { body, color, visible } = await request.json();
    await env.DB.prepare('DELETE FROM notes').run();
    await env.DB.prepare(
      'INSERT INTO notes (body, color, visible, updated_at) VALUES (?, ?, ?, ?)'
    ).bind(body || '', color || 'red', visible ? 1 : 0, new Date().toISOString()).run();

    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Notes POST: ' + (err && err.message || String(err)) }, 500);
  }
}