// Shared helpers for Cloudflare Pages Functions

export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 50000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

function readSessionToken(request) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/session=([a-f0-9]+)/);
  return m ? m[1] : null;
}

export async function getSession(context) {
  const token = readSessionToken(context.request);
  if (!token) return null;
  return await context.env.DB.prepare(
    `SELECT s.token AS session_token, u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`
  ).bind(token, Date.now()).first();
}

export async function requireAuth(context) {
  const user = await getSession(context);
  if (!user) return { error: json({ error: 'Unauthorized' }, 401) };
  return { user };
}

export async function requireAdmin(context) {
  const user = await getSession(context);
  if (!user) return { error: json({ error: 'Unauthorized' }, 401) };
  if (user.role !== 'admin') return { error: json({ error: 'Forbidden' }, 403) };
  return { user };
}

export function safeUser(u) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    phone: u.phone,
    address: u.address,
    role: u.role,
    awardedAmount: u.awarded_amount,
    fundsLocked: !!u.funds_locked,
    lockReason: u.lock_reason || '',
    siteNotes: u.site_notes || '',
    verified: !!u.verified,
    createdAt: u.created_at
  };
}

export function setCookie(token, maxAge = 60 * 60 * 24 * 7) {
  return `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}