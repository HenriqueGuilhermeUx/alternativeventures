import { authorize, unauthorized, response, providerCatalog, CONSUMERS, DOCUMENT_TYPES } from './_document-intelligence.mjs';

export default async (req) => {
  if (req.method !== 'GET') return response(405, { ok: false, error: 'method_not_allowed' });
  if (!authorize(req).ok) return unauthorized();
  return response(200, { ok: true, providers: providerCatalog(), consumers: CONSUMERS, documentTypes: DOCUMENT_TYPES });
};

export const config = { path: '/api/document-intelligence/providers' };
