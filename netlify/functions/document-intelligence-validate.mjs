import { authorize, unauthorized, response, validateDocument } from './_document-intelligence.mjs';

export default async (req) => {
  if (req.method !== 'POST') return response(405, { ok: false, error: 'method_not_allowed' });
  if (!authorize(req).ok) return unauthorized();
  let body;
  try { body = await req.json(); } catch { return response(400, { ok: false, error: 'invalid_json' }); }
  return response(200, { ok: true, ...validateDocument(body?.document || body) });
};

export const config = { path: '/api/document-intelligence/validate' };
