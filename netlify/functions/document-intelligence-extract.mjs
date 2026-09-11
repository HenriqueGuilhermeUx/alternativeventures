import crypto from 'node:crypto';
import { authorize, unauthorized, response, extract, persistJob, validateDocument } from './_document-intelligence.mjs';

export default async (req) => {
  if (req.method !== 'POST') return response(405, { ok: false, error: 'method_not_allowed' });
  if (!authorize(req).ok) return unauthorized();
  let payload;
  try { payload = await req.json(); } catch { return response(400, { ok: false, error: 'invalid_json' }); }
  const jobId = crypto.randomUUID();
  try {
    const out = await extract(payload || {});
    const validation = validateDocument(out.result);
    const persisted = await persistJob({ jobId, ...out });
    return response(200, { ok: true, jobId, status: 'completed', persisted, consumer: out.consumer, provider: out.provider, processingMs: out.processingMs, validation, result: out.result });
  } catch (err) {
    return response(err?.status || 500, { ok: false, jobId, status: 'failed', error: err?.message || 'document_intelligence_error' });
  }
};

export const config = { path: '/api/document-intelligence/extract' };
