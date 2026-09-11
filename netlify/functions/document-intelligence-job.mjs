import { authorize, unauthorized, response, readJob } from './_document-intelligence.mjs';

export default async (req) => {
  if (req.method !== 'GET') return response(405, { ok: false, error: 'method_not_allowed' });
  if (!authorize(req).ok) return unauthorized();
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const id = parts.at(-1);
  if (!id || id === 'jobs') return response(400, { ok: false, error: 'job_id_required' });
  const { configured, job } = await readJob(id);
  if (!configured) return response(503, { ok: false, error: 'data_hub_not_configured' });
  if (!job) return response(404, { ok: false, error: 'job_not_found' });
  return response(200, { ok: true, job });
};

export const config = { path: '/api/document-intelligence/jobs/:id' };
