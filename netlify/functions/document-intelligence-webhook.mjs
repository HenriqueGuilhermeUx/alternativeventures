import { authorize, unauthorized, response, updateJob } from './_document-intelligence.mjs';

export default async (req) => {
  if (req.method !== 'POST') return response(405, { ok: false, error: 'method_not_allowed' });
  if (!authorize(req, { serviceOnly: true }).ok) return unauthorized();
  let body;
  try { body = await req.json(); } catch { return response(400, { ok: false, error: 'invalid_json' }); }
  if (!body?.jobId) return response(400, { ok: false, error: 'job_id_required' });
  if (body.result || body.content || body.text || body.base64 || body.file) return response(400, { ok: false, error: 'document_content_not_allowed_in_webhook' });
  const ok = await updateJob(body.jobId, {
    status: body.status,
    provider: body.provider,
    document_type: body.documentType,
    confidence: body.confidence,
    processing_ms: body.processingMs,
    metadata: body.metadata
  });
  return response(ok ? 200 : 503, { ok, jobId: body.jobId });
};

export const config = { path: '/api/document-intelligence/webhooks' };
