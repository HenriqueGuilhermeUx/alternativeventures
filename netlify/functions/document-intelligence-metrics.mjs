import { authorize, unauthorized, response, metrics, providerCatalog, CONSUMERS } from './_document-intelligence.mjs';

export default async (req) => {
  if (req.method !== 'GET') return response(405, { ok: false, error: 'method_not_allowed' });
  if (!authorize(req).ok) return unauthorized();
  return response(200, { ok: true, metrics: await metrics(), providers: providerCatalog(), consumers: CONSUMERS });
};

export const config = { path: '/api/document-intelligence/metrics' };
