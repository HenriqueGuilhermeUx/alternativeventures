import crypto from 'node:crypto';
import { verifySession } from './_auth.mjs';
import { configured as supabaseConfigured, sb } from './_supabase.mjs';

export const CONSUMERS = {
  nextgen: { name: 'NextGen', status: 'priority', types: ['invoice','receipt','expense','proof_of_payment','purchase_order','quotation','other'] },
  docwallet: { name: 'DocWallet', status: 'priority', types: ['contract','certificate','corporate_document','identity_document','legal_document','other'] },
  sindcopilot: { name: 'SindCopilot', status: 'planned', types: ['meeting_minutes','contract','quotation','invoice','receipt','proof_of_payment','other'] },
  nexjud: { name: 'NexJud', status: 'planned', types: ['contract','legal_document','power_of_attorney','corporate_document','other'] },
  staff: { name: 'Staff', status: 'planned', types: ['receipt','invoice','bill','contract','warranty','medical_document','identity_document','other'] },
  taxagent: { name: 'TaxAgent', status: 'planned', types: ['invoice','fiscal_document','receipt','proof_of_payment','other'] },
  mindcompliance: { name: 'MindCompliance', status: 'planned', types: ['contract','corporate_document','certificate','legal_document','other'] },
  'f-insight': { name: 'F-Insight', status: 'planned', types: ['bank_statement','financial_report','invoice','other'] },
  mydatamed: { name: 'MyDataMed', status: 'future', types: ['medical_document','invoice','receipt','other'] },
  'health-wallet': { name: 'Health Wallet', status: 'future', types: ['medical_document','receipt','invoice','other'] },
};

export const DOCUMENT_TYPES = [
  'invoice','receipt','bill','expense','contract','bank_statement','financial_report','certificate',
  'legal_document','fiscal_document','corporate_document','meeting_minutes','quotation','purchase_order',
  'proof_of_payment','power_of_attorney','identity_document','medical_document','warranty','other'
];

function env(name) {
  try { return globalThis.Netlify?.env?.get(name) || ''; } catch { return ''; }
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ''));
  const B = Buffer.from(String(b || ''));
  if (!A.length || A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

export function authorize(req, { serviceOnly = false } = {}) {
  const serviceKey = env('AV_DOCUMENT_INTELLIGENCE_KEY');
  const suppliedKey = req.headers.get('x-av-document-key') || '';
  if (serviceKey && safeEqual(serviceKey, suppliedKey)) return { ok: true, mode: 'service', subject: 'service' };
  if (serviceOnly) return { ok: false };
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const session = verifySession(token);
  return session ? { ok: true, mode: 'founder', subject: session.sub } : { ok: false };
}

export function unauthorized() { return json(401, { ok: false, error: 'unauthorized' }); }
export function response(status, body) { return json(status, body); }

export function providerCatalog() {
  const externalUrl = env('AV_DOCUMENT_PROVIDER_URL');
  const allowMock = env('AV_DOCUMENT_ALLOW_MOCK') === 'true';
  return [
    { id: 'internal', name: 'AV Internal Heuristic', configured: true, binary: false, externalProcessing: false, description: 'Classificação e extração básica a partir de texto já disponível.' },
    { id: 'external', name: 'External Document Provider', configured: Boolean(externalUrl), binary: true, externalProcessing: true, description: 'Adapter HTTP para OCR/Document AI externo, configurado por ambiente.' },
    { id: 'mock', name: 'Mock Provider', configured: allowMock, binary: true, externalProcessing: false, description: 'Somente desenvolvimento e testes.' },
  ];
}

function sha256(value) { return crypto.createHash('sha256').update(value || '').digest('hex'); }
function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }
function numberFromMoney(raw) {
  const s = String(raw || '').replace(/R\$|US\$|USD|BRL/gi,'').replace(/\s/g,'');
  if (!s) return null;
  const normalized = s.includes(',') ? s.replace(/\./g,'').replace(',','.') : s;
  const n = Number(normalized.replace(/[^0-9.-]/g,''));
  return Number.isFinite(n) ? n : null;
}

function detectType(text) {
  const t = text.toLowerCase();
  const rules = [
    ['meeting_minutes', /(ata de|assembleia|reuni[aã]o|delibera[cç][aã]o)/],
    ['bank_statement', /(extrato banc[aá]rio|saldo anterior|ag[eê]ncia|conta corrente)/],
    ['proof_of_payment', /(comprovante de (pagamento|pix|transfer[eê]ncia)|transa[cç][aã]o realizada)/],
    ['purchase_order', /(pedido de compra|purchase order|ordem de compra)/],
    ['quotation', /(or[cç]amento|proposta comercial|validade da proposta)/],
    ['fiscal_document', /(nf-?e|nfs-?e|nota fiscal|chave de acesso|danfe)/],
    ['invoice', /(invoice|fatura|nota de cobran[cç]a)/],
    ['receipt', /(recibo|recebemos de|cupom fiscal)/],
    ['contract', /(contrato|contratante|contratada|cl[aá]usula|vig[eê]ncia)/],
    ['power_of_attorney', /(procura[cç][aã]o|outorgante|outorgado)/],
    ['certificate', /(certificado|certifica-se|certid[aã]o)/],
    ['identity_document', /(carteira de identidade|rg\b|documento de identidade)/],
    ['medical_document', /(paciente|laudo|exame|diagn[oó]stico|prescri[cç][aã]o)/],
    ['warranty', /(garantia|warranty)/],
  ];
  return rules.find(([,r]) => r.test(t))?.[0] || 'other';
}

function extractDates(text) {
  const matches = text.match(/\b(?:0?[1-9]|[12]\d|3[01])[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:19|20)?\d{2}\b/g) || [];
  return uniq(matches).slice(0, 20).map((value, i) => ({ label: i === 0 ? 'document_date' : 'date', value }));
}

function extractAmounts(text) {
  const re = /(?:R\$|BRL|US\$|USD)\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})|(?:R\$|BRL|US\$|USD)\s*\d+(?:[.,]\d{2})/gi;
  return uniq(text.match(re) || []).slice(0, 30).map(raw => ({ currency: /US\$|USD/i.test(raw) ? 'USD' : 'BRL', raw, value: numberFromMoney(raw) }));
}

function extractIdentifiers(text) {
  const out = [];
  for (const value of uniq(text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g) || [])) out.push({ type: 'cnpj', value });
  for (const value of uniq(text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g) || [])) out.push({ type: 'cpf', value });
  for (const value of uniq(text.match(/\b\d{44}\b/g) || [])) out.push({ type: 'fiscal_access_key', value });
  return out.slice(0, 30);
}

function extractDocumentNumber(text) {
  const m = text.match(/(?:n[º°o.]?|n[uú]mero|number)\s*[:#-]?\s*([A-Z0-9./-]{3,30})/i);
  return m?.[1] || null;
}

function extractParties(text) {
  const labels = ['contratante','contratada','fornecedor','cliente','emitente','destinat[aá]rio','outorgante','outorgado'];
  const out = [];
  for (const label of labels) {
    const r = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n;]{3,120})`, 'i');
    const m = text.match(r);
    if (m) out.push({ role: label, name: clean(m[1]) });
  }
  return out.slice(0, 20);
}

function extractItems(text) {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  return lines.filter(line => /\b\d+(?:[.,]\d+)?\s*(?:x|un|unid|kg|g|l|ml)\b/i.test(line) || /R\$\s*\d/.test(line)).slice(0, 50).map((description, i) => ({ index: i + 1, description }));
}

function extractObligations(text) {
  const sentences = text.split(/(?<=[.!?;])\s+/).map(clean);
  return sentences.filter(s => /(dever[aá]|obriga-se|fica obrigado|prazo|multa|rescis[aã]o|renova[cç][aã]o)/i.test(s)).slice(0, 20).map((text, i) => ({ index: i + 1, text }));
}

function makeSummary(type, { amounts, dates, parties, items, obligations }) {
  const bits = [`Documento classificado como ${type}.`];
  if (amounts.length) bits.push(`${amounts.length} valor(es) detectado(s).`);
  if (dates.length) bits.push(`${dates.length} data(s) detectada(s).`);
  if (parties.length) bits.push(`${parties.length} parte(s)/entidade(s) identificada(s).`);
  if (items.length) bits.push(`${items.length} linha(s) potencialmente relacionadas a itens.`);
  if (obligations.length) bits.push(`${obligations.length} obrigação(ões)/cláusula(s) relevante(s) sinalizada(s).`);
  return bits.join(' ');
}

function confidenceFor(doc) {
  let score = doc.documentType !== 'other' ? 0.45 : 0.25;
  if (doc.dates.length) score += 0.10;
  if (doc.amounts.length) score += 0.10;
  if (doc.identifiers.length) score += 0.10;
  if (doc.parties.length) score += 0.10;
  if (doc.documentNumber) score += 0.05;
  if (doc.items.length || doc.obligations.length) score += 0.05;
  return Math.min(0.95, Number(score.toFixed(2)));
}

function internalExtract(payload) {
  const text = String(payload.text || '');
  if (!text.trim()) throw Object.assign(new Error('internal_provider_requires_text'), { status: 422 });
  const inferred = payload.documentType && payload.documentType !== 'auto' ? payload.documentType : detectType(text);
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const identifiers = extractIdentifiers(text);
  const parties = extractParties(text);
  const items = extractItems(text);
  const obligations = extractObligations(text);
  const result = {
    documentId: crypto.randomUUID(), documentType: DOCUMENT_TYPES.includes(inferred) ? inferred : 'other', confidence: 0,
    issuer: parties.find(x => ['fornecedor','emitente','contratada'].includes(x.role))?.name || null,
    recipient: parties.find(x => ['cliente','destinatário','destinatario','contratante'].includes(x.role))?.name || null,
    documentNumber: extractDocumentNumber(text), dates, parties, amounts, items, identifiers, obligations,
    summary: '', source: { filename: payload.file?.name || null, mimeType: payload.file?.mimeType || 'text/plain', pages: Number(payload.file?.pages || 1), hash: sha256(text) },
    metadata: { engine: 'internal', rawTextPersisted: false }
  };
  result.summary = makeSummary(result.documentType, result);
  result.confidence = confidenceFor(result);
  return result;
}

async function externalExtract(payload) {
  const url = env('AV_DOCUMENT_PROVIDER_URL');
  if (!url) throw Object.assign(new Error('external_provider_not_configured'), { status: 503 });
  if (payload.allowExternalProcessing !== true) throw Object.assign(new Error('external_processing_requires_explicit_consent'), { status: 422 });
  const token = env('AV_DOCUMENT_PROVIDER_TOKEN');
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!r.ok) throw Object.assign(new Error(`external_provider_http_${r.status}`), { status: 502 });
  const data = await r.json();
  const result = data.result || data;
  if (!result || typeof result !== 'object') throw Object.assign(new Error('external_provider_invalid_response'), { status: 502 });
  result.documentId ||= crypto.randomUUID();
  result.documentType = DOCUMENT_TYPES.includes(result.documentType) ? result.documentType : (payload.documentType === 'auto' ? 'other' : payload.documentType || 'other');
  result.confidence = Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : 0;
  result.source ||= { filename: payload.file?.name || null, mimeType: payload.file?.mimeType || null, pages: Number(payload.file?.pages || 1), hash: sha256(payload.text || payload.file?.base64 || '') };
  result.metadata = { ...(result.metadata || {}), engine: 'external', rawTextPersisted: false };
  return result;
}

function mockExtract(payload) {
  if (env('AV_DOCUMENT_ALLOW_MOCK') !== 'true') throw Object.assign(new Error('mock_provider_disabled'), { status: 403 });
  return {
    documentId: crypto.randomUUID(), documentType: payload.documentType && payload.documentType !== 'auto' ? payload.documentType : 'receipt', confidence: 0.99,
    issuer: 'Empresa Exemplo', recipient: null, documentNumber: 'MOCK-001',
    dates: [{ label: 'document_date', value: '10/09/2026' }], parties: [{ role: 'fornecedor', name: 'Empresa Exemplo' }],
    amounts: [{ currency: 'BRL', raw: 'R$ 123,45', value: 123.45 }], items: [], identifiers: [], obligations: [],
    summary: 'Documento simulado para teste do pipeline.',
    source: { filename: payload.file?.name || 'mock.txt', mimeType: payload.file?.mimeType || 'text/plain', pages: 1, hash: sha256('mock') },
    metadata: { engine: 'mock', rawTextPersisted: false }
  };
}

export async function extract(payload) {
  const consumer = String(payload.consumer || '').trim();
  if (!CONSUMERS[consumer]) throw Object.assign(new Error('invalid_consumer'), { status: 400 });
  const requestedType = payload.documentType || 'auto';
  if (requestedType !== 'auto' && !DOCUMENT_TYPES.includes(requestedType)) throw Object.assign(new Error('invalid_document_type'), { status: 400 });
  if (requestedType !== 'auto' && !CONSUMERS[consumer].types.includes(requestedType) && requestedType !== 'other') throw Object.assign(new Error('document_type_not_allowed_for_consumer'), { status: 403 });
  const binary = Boolean(payload.file?.base64);
  const requestedProvider = payload.provider || env('AV_DOCUMENT_INTELLIGENCE_PROVIDER') || (binary ? 'external' : 'internal');
  const start = Date.now();
  let result;
  if (requestedProvider === 'internal') result = internalExtract(payload);
  else if (requestedProvider === 'external') result = await externalExtract(payload);
  else if (requestedProvider === 'mock') result = mockExtract(payload);
  else throw Object.assign(new Error('unknown_provider'), { status: 400 });
  const processingMs = Date.now() - start;
  return { consumer, provider: requestedProvider, processingMs, result };
}

export function validateDocument(doc) {
  const issues = [];
  if (!doc || typeof doc !== 'object') return { valid: false, issues: [{ field: 'document', severity: 'error', message: 'Documento estruturado ausente.' }] };
  if (!DOCUMENT_TYPES.includes(doc.documentType)) issues.push({ field: 'documentType', severity: 'error', message: 'Tipo de documento inválido.' });
  if (Number(doc.confidence || 0) < 0.5) issues.push({ field: 'confidence', severity: 'warning', message: 'Confiança baixa; revisão humana recomendada.' });
  if (['invoice','receipt','expense','proof_of_payment','fiscal_document'].includes(doc.documentType) && !(doc.amounts || []).length) issues.push({ field: 'amounts', severity: 'warning', message: 'Nenhum valor monetário detectado.' });
  if (doc.documentType === 'contract' && !(doc.parties || []).length) issues.push({ field: 'parties', severity: 'warning', message: 'Nenhuma parte contratual detectada.' });
  if (doc.documentType === 'meeting_minutes' && !(doc.dates || []).length) issues.push({ field: 'dates', severity: 'warning', message: 'Nenhuma data detectada na ata.' });
  return { valid: !issues.some(x => x.severity === 'error'), issues };
}

export async function persistJob({ jobId, consumer, provider, result, processingMs, status = 'completed' }) {
  if (!supabaseConfigured) return false;
  const row = {
    id: jobId, consumer, status, provider, document_type: result?.documentType || null,
    confidence: result?.confidence ?? null, processing_ms: processingMs ?? null,
    page_count: result?.source?.pages || 1, source_hash: result?.source?.hash || null,
    source_filename: result?.source?.filename || null,
    metadata: { fields: { dates: result?.dates?.length || 0, parties: result?.parties?.length || 0, amounts: result?.amounts?.length || 0, items: result?.items?.length || 0, obligations: result?.obligations?.length || 0 }, contentPersisted: false }
  };
  const r = await sb('av_document_jobs', { method: 'POST', body: JSON.stringify(row) });
  if (r.ok) await sb('av_events', { method: 'POST', body: JSON.stringify({ venture_slug: consumer, event_name: 'document.analyzed', numeric_value: 1, unit: 'document', metadata: { provider, documentType: result?.documentType || null, confidence: result?.confidence ?? null, processingMs } }) });
  return r.ok;
}

export async function readJob(id) {
  if (!supabaseConfigured) return { configured: false, job: null };
  const r = await sb(`av_document_jobs?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const rows = r.ok ? await r.json() : [];
  return { configured: true, job: rows[0] || null };
}

export async function updateJob(id, patch) {
  if (!supabaseConfigured) return false;
  const allowed = {};
  for (const key of ['status','provider','document_type','confidence','processing_ms','metadata']) if (patch[key] !== undefined) allowed[key] = patch[key];
  allowed.updated_at = new Date().toISOString();
  const r = await sb(`av_document_jobs?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(allowed) });
  return r.ok;
}

export async function metrics() {
  if (!supabaseConfigured) return { configured: false, documents: 0, failures: 0, averageProcessingMs: 0, averageConfidence: 0, byConsumer: {}, byProvider: {} };
  const r = await sb('av_document_jobs?select=consumer,status,provider,document_type,confidence,processing_ms,created_at&order=created_at.desc&limit=500');
  const rows = r.ok ? await r.json() : [];
  const sum = (arr, key) => arr.reduce((a, x) => a + Number(x[key] || 0), 0);
  const byConsumer = {}, byProvider = {};
  for (const row of rows) { byConsumer[row.consumer] = (byConsumer[row.consumer] || 0) + 1; byProvider[row.provider] = (byProvider[row.provider] || 0) + 1; }
  return {
    configured: true, documents: rows.length, failures: rows.filter(x => x.status === 'failed').length,
    averageProcessingMs: rows.length ? Math.round(sum(rows,'processing_ms') / rows.length) : 0,
    averageConfidence: rows.length ? Number((sum(rows,'confidence') / rows.length).toFixed(2)) : 0,
    byConsumer, byProvider
  };
}
