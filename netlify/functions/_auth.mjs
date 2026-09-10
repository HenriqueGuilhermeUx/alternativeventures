import crypto from 'node:crypto';

const enc = (value) => Buffer.from(value).toString('base64url');
const dec = (value) => Buffer.from(value, 'base64url').toString('utf8');

function safeEqual(a, b) {
  const A = Buffer.from(String(a ?? ''));
  const B = Buffer.from(String(b ?? ''));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function signature(unsigned, secret) {
  return crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
}

export function authConfigured() {
  return Boolean(process.env.AVOS_ACCESS_EMAIL && process.env.AVOS_ACCESS_CODE && process.env.AVOS_SESSION_SECRET);
}

export function credentialsValid(email, code) {
  const expectedEmail = String(process.env.AVOS_ACCESS_EMAIL || '').trim().toLowerCase();
  const expectedCode = String(process.env.AVOS_ACCESS_CODE || '');
  return safeEqual(String(email || '').trim().toLowerCase(), expectedEmail) && safeEqual(String(code || ''), expectedCode);
}

export function createSession(email, hours = 12) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: String(email).trim().toLowerCase(), iat: now, exp: now + hours * 3600 };
  const header = { alg: 'HS256', typ: 'AVOS' };
  const unsigned = `${enc(JSON.stringify(header))}.${enc(JSON.stringify(payload))}`;
  return `${unsigned}.${signature(unsigned, process.env.AVOS_SESSION_SECRET)}`;
}

export function verifySession(token) {
  try {
    if (!authConfigured() || !token) return null;
    const [h, p, sig] = token.split('.');
    if (!h || !p || !sig) return null;
    const unsigned = `${h}.${p}`;
    const expected = signature(unsigned, process.env.AVOS_SESSION_SECRET);
    if (!safeEqual(sig, expected)) return null;
    const payload = JSON.parse(dec(p));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!safeEqual(payload.sub, String(process.env.AVOS_ACCESS_EMAIL).trim().toLowerCase())) return null;
    return payload;
  } catch {
    return null;
  }
}

export function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}
