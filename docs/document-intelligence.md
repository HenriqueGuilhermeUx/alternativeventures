# AV Document Intelligence

Shared document-understanding infrastructure for the Alternative Ventures portfolio.

## Principle

**Document → understanding → structured data → action.**

This service is infrastructure, not an end-user product. It exists so ventures do not duplicate OCR, classification, extraction, validation and telemetry logic.

Initial consumers:

- NextGen
- DocWallet
- SindCopilot
- NexJud
- Staff
- TaxAgent
- MindCompliance
- F-Insight
- MyDataMed / Health Wallet (future use cases)

## Security model

The API accepts either:

1. an authenticated AV OS founder session (`Authorization: Bearer ...`), or
2. a server-to-server key (`x-av-document-key`).

The service key must live only in backend/server environments.

Document content is **not** sent to AV OS telemetry. The metadata table stores only operational fields such as consumer, provider, document type, confidence, page count, processing time and field counts.

The current engine does not persist raw text, OCR output or extracted parties/amounts in the AV OS Data Hub.

## Endpoints

### POST `/api/document-intelligence/extract`

Text example:

```json
{
  "consumer": "nextgen",
  "documentType": "auto",
  "provider": "internal",
  "text": "RECIBO\nFornecedor: Empresa ABC\nData: 10/09/2026\nValor R$ 248,90"
}
```

Response:

```json
{
  "ok": true,
  "jobId": "uuid",
  "status": "completed",
  "consumer": "nextgen",
  "provider": "internal",
  "processingMs": 4,
  "validation": {
    "valid": true,
    "issues": []
  },
  "result": {
    "documentType": "receipt",
    "confidence": 0.75,
    "dates": [],
    "amounts": [],
    "parties": [],
    "items": [],
    "identifiers": [],
    "obligations": [],
    "source": {
      "hash": "sha256"
    }
  }
}
```

### GET `/api/document-intelligence/providers`

Returns provider status, supported consumers and document types.

### POST `/api/document-intelligence/validate`

Validates a normalized document object and returns warnings/errors for human review.

### GET `/api/document-intelligence/jobs/:id`

Returns operational job metadata when the dedicated AV OS Supabase Data Hub is connected.

### GET `/api/document-intelligence/metrics`

Returns aggregate usage/reliability data for the AV OS Shared Capabilities page.

### POST `/api/document-intelligence/webhooks`

Server-only endpoint for future asynchronous providers. It rejects document content and accepts only operational job updates.

## Providers

### `internal`

Active by default. It works with text already extracted from a document and performs deterministic classification/normalization for common Brazilian business documents.

It does **not** OCR binary images or PDFs.

### `external`

Generic adapter for a future OCR/Document AI service. Configure:

- `AV_DOCUMENT_PROVIDER_URL`
- `AV_DOCUMENT_PROVIDER_TOKEN`

For privacy, calls to an external provider require `allowExternalProcessing: true` in the extraction payload.

This adapter lets us connect DocStruct or another provider through a thin AV-controlled wrapper without coupling each venture directly to a vendor contract.

### `mock`

Disabled in production unless `AV_DOCUMENT_ALLOW_MOCK=true`.

## Data Hub migration

Run:

`infra/supabase/document-intelligence.sql`

The table `av_document_jobs` intentionally stores metadata only.

## Environment variables

```text
AV_DOCUMENT_INTELLIGENCE_KEY=
AV_DOCUMENT_INTELLIGENCE_PROVIDER=internal
AV_DOCUMENT_ALLOW_MOCK=false
AV_DOCUMENT_PROVIDER_URL=
AV_DOCUMENT_PROVIDER_TOKEN=
```

## Consumer rollout

1. NextGen — invoices, receipts, expenses, proof of payment, purchase orders and quotations.
2. DocWallet — contracts, certificates, corporate/legal documents.
3. SindCopilot — meeting minutes, quotes, invoices, receipts and contracts.
4. NexJud — contracts, legal documents, powers of attorney and corporate documents.
5. Staff — receipts, bills, warranties and personal documents.
6. TaxAgent — fiscal documents and invoices.
7. MindCompliance — evidence, certificates, contracts and corporate documents.
8. F-Insight — bank statements and financial reports.

## Current limitation

v0.1 is already usable for **text → structured data**. Image/PDF OCR is intentionally kept behind the external-provider adapter so we can choose the provider and privacy model without rebuilding every venture.
