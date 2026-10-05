import { json, requireAdmin } from '../../_utils.js';

export async function onRequestPatch(context) {
  let sql = null, bind = null;
  try {
    const { params, request } = context;
    const { error } = await requireAdmin(context);
    if (error) return error;

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Invalid JSON in request body' }, 400); }

    const fields = [], values = [];

    if (typeof body.status === 'string' && body.status.trim()) {
      const valid = ['pending','under_review','approved','processing','completed','rejected'];
      if (!valid.includes(body.status)) {
        return json({ error: 'Invalid status: ' + body.status }, 400);
      }
      fields.push('status = ?');
      values.push(body.status);
    }

    if (body.progress !== undefined && body.progress !== null && body.progress !== '') {
      const p = Math.max(0, Math.min(100, Math.round(Number(body.progress))));
      if (isNaN(p)) return json({ error: 'Invalid progress value' }, 400);
      fields.push('progress = ?');
      values.push(p);
    }

    if (typeof body.note === 'string') {
      fields.push('note = ?');
      values.push(body.note);
    }

    if (!fields.length) return json({ error: 'No fields to update' }, 400);

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(params.id);

    sql = `UPDATE withdrawals SET ${fields.join(', ')} WHERE id = ?`;
    bind = values;

    await context.env.DB.prepare(sql).bind(...bind).run();
    return json({ ok: true });
  } catch (err) {
    return json({
      error: 'Withdrawal PATCH: ' + (err && err.message ? err.message : String(err)),
      stack: err && err.stack ? err.stack.split('\n').slice(0, 5) : null,
      sql, bind
    }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const { params } = context;
    const { error } = await requireAdmin(context);
    if (error) return error;

    await context.env.DB.prepare('DELETE FROM withdrawals WHERE id = ?').bind(params.id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Withdrawal DELETE: ' + (err && err.message || String(err)) }, 500);
  }
}