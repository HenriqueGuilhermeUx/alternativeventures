import { authConfigured, verifySession, json } from './_auth.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'method_not_allowed' });
  if (!authConfigured()) return json(503, { ok: false, error: 'auth_not_configured' });
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const payload = verifySession(token);
  if (!payload) return json(401, { ok: false, error: 'invalid_session' });
  return json(200, { ok: true, user: { email: payload.sub }, expiresAt: payload.exp });
}
