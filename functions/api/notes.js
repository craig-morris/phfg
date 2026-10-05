import { json, requireAdmin } from './_utils.js';

export async function onRequestGet(context) {
  const row = await context.env.DB.prepare(
    'SELECT id, body, color, updated_at FROM notes WHERE visible = 1 ORDER BY id DESC LIMIT 1'
  ).first();
  return json({ note: row || null });
}

export async function onRequestPost(context) {
  const { error } = await requireAdmin(context);
  if (error) return error;

  const { body, color, visible } = await context.request.json();
  await context.env.DB.prepare('DELETE FROM notes').run();
  await context.env.DB.prepare(
    'INSERT INTO notes (body, color, visible, updated_at) VALUES (?, ?, ?, ?)'
  ).bind(body || '', color || 'red', visible ? 1 : 0, new Date().toISOString()).run();

  return json({ ok: true });
}