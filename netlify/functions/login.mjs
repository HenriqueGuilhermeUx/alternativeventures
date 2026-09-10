import { authConfigured, credentialsValid, createSession, json } from './_auth.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  if (!authConfigured()) return json(503, { ok: false, error: 'auth_not_configured' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }); }

  const email = String(body.email || '').trim();
  const code = String(body.code || '');
  if (!email || !code) return json(400, { ok: false, error: 'missing_credentials' });
  if (!credentialsValid(email, code)) return json(401, { ok: false, error: 'invalid_credentials' });

  const token = createSession(email, 12);
  return json(200, { ok: true, token, expiresIn: 43200, user: { email: email.toLowerCase() } });
}
