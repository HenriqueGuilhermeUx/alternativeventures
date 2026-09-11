import crypto from 'node:crypto';
import { authorize, unauthorized, response, persistJob } from './_document-intelligence.mjs';
import { runDocumentIntake, intakeCatalog } from './_document-intake.mjs';

function field(form, name, fallback = '') {
  const value = form.get(name);
  return value == null ? fallback : String(value);
}

async function payloadFromRequest(req) {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    const payload = {
      consumer: field(form, 'consumer'),
      documentType: field(form, 'documentType', 'auto'),
      intakeProvider: field(form, 'intakeProvider', 'auto'),
      allowExternalProcessing: field(form, 'allowExternalProcessing', 'false'),
      includeText: field(form, 'includeText', 'false'),
      text: field(form, 'text', ''),
    };
    if (file && typeof file.arrayBuffer === 'function') {
      const bytes = Buffer.from(await file.arrayBuffer());
      payload.file = {
        name: file.name || 'documento',
        mimeType: file.type || 'application/octet-stream',
        base64: bytes.toString('base64'),
      };
    }
    return payload;
  }
  if (contentType.includes('application/json')) return req.json();
  const text = await req.text();
  return { consumer: 'nexjud', documentType: 'auto', text };
}

export default async (req) => {
  if (req.method === 'GET') {
    if (!authorize(req).ok) return unauthorized();
    return response(200, { ok: true, ...intakeCatalog() });
  }
  if (req.method !== 'POST') return response(405, { ok: false, error: 'method_not_allowed' });
  if (!authorize(req).ok) return unauthorized();

  const jobId = crypto.randomUUID();
  const start = Date.now();
  try {
    const payload = await payloadFromRequest(req);
    const out = await runDocumentIntake(payload || {});
    const provider = `${out.intakeProvider}->${out.structuringProvider}`;
    const persisted = await persistJob({
      jobId,
      consumer: out.consumer,
      provider,
      result: out.result,
      processingMs: out.processingMs,
      status: 'completed',
    });
    return response(200, {
      ok: true,
      jobId,
      status: 'completed',
      persisted,
      consumer: out.consumer,
      intakeProvider: out.intakeProvider,
      structuringProvider: out.structuringProvider,
      processingMs: out.processingMs,
      extraction: out.extraction,
      validation: out.validation,
      result: out.result,
      ...(out.extractedText !== undefined ? { extractedText: out.extractedText } : {}),
    });
  } catch (error) {
    console.error('[AV Document Intake]', error?.message || error);
    return response(error?.status || 500, {
      ok: false,
      jobId,
      status: 'failed',
      processingMs: Date.now() - start,
      error: error?.message || 'document_intake_error',
      ...(error?.details ? { details: error.details } : {}),
    });
  }
};

export const config = { path: '/api/document-intelligence/intake' };
