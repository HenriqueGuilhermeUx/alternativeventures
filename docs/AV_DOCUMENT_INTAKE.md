# AV Document Intake

Shared document-ingestion boundary for Alternative Ventures products.

## Goal

One contract for receiving text or files, extracting readable content, normalizing it through AV Document Intelligence, validating the structured result and returning it to the calling venture.

Production endpoint:

`POST https://alternativeventures.com.br/api/document-intelligence/intake`

Catalog/status:

`GET https://alternativeventures.com.br/api/document-intelligence/intake`

## Authentication

Server-to-server consumers use:

`x-av-document-key: <AV_DOCUMENT_INTELLIGENCE_KEY>`

Founder calls from AV OS may use the AV OS session. The service key must never be exposed in browser bundles.

## Privacy model

- Raw file is processed in memory and is not persisted by AV OS.
- Extracted text is not persisted by AV OS.
- Job telemetry may persist consumer, provider, timing, confidence, status and non-content metrics.
- Binary OCR/vision requires explicit `allowExternalProcessing=true`.
- Product databases remain the source of truth for their own documents.

## Supported inputs

- Text passed directly in JSON.
- Multipart upload: PDF, PNG/JPG/WebP, TXT/CSV/JSON/XML and DOC/DOCX.
- Default maximum upload size: 5 MB (`AV_DOCUMENT_MAX_BYTES`).
- Default maximum text passed to structuring: 250k chars (`AV_DOCUMENT_MAX_TEXT_CHARS`).

## JSON request

```json
{
  "consumer": "nexjud",
  "documentType": "contract",
  "intakeProvider": "auto",
  "text": "...",
  "allowExternalProcessing": false,
  "includeText": false,
  "file": {
    "name": "contrato.pdf",
    "mimeType": "application/pdf",
    "pages": 12
  }
}
```

## Multipart request

Fields:

- `consumer`
- `documentType` (`auto` by default)
- `intakeProvider` (`auto`, `internal`, `openai`/`ocr`, or `external`)
- `allowExternalProcessing`
- `includeText`
- `text` (optional)
- `file` (optional when text is supplied)

## Response

```json
{
  "ok": true,
  "jobId": "...",
  "status": "completed",
  "consumer": "nexjud",
  "intakeProvider": "provided_text",
  "structuringProvider": "internal",
  "processingMs": 27,
  "extraction": {
    "mimeType": "application/pdf",
    "fileName": "contrato.pdf",
    "bytes": 12345,
    "textChars": 40211,
    "truncated": false
  },
  "validation": {},
  "result": {
    "documentType": "contract",
    "confidence": 0.85,
    "issuer": null,
    "recipient": null,
    "documentNumber": null,
    "dates": [],
    "parties": [],
    "amounts": [],
    "items": [],
    "identifiers": [],
    "obligations": [],
    "summary": "..."
  }
}
```

## Pipeline

`file/text → intake → transcription/OCR when needed → classification → extraction → normalization → validation → consumer`

Textual inputs stay on the internal structuring path. Binary OCR can use the configured OpenAI OCR route or the optional external adapter. The document itself is not stored by the shared service.

## Current production consumers

- NexJud: active. Knowledge Base extracts locally today and routes normalized text through Intake.
- SindCopilot: active. Existing local extraction/indexing remains a safe fallback while normalized text routes through Intake.

This migration pattern is intentional: consumers can move to raw-binary Intake gradually without breaking their existing document flows.

## Next consumers

Recommended order: DocWallet → TaxAgent → NextGen → Staff → MindCompliance → F-Insight.
