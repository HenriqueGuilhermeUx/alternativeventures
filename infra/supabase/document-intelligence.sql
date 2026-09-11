-- AV Document Intelligence — metadata only
-- This table intentionally does NOT persist document content, OCR text, parties, CPF/CNPJ or extracted payloads.
-- It stores operational metadata so AV OS can measure usage, reliability and cost safely.

create extension if not exists pgcrypto;

create table if not exists av_document_jobs (
  id uuid primary key default gen_random_uuid(),
  consumer text not null,
  status text not null default 'completed' check (status in ('queued','processing','completed','failed','needs_review')),
  provider text not null,
  document_type text,
  confidence numeric(5,4),
  processing_ms integer,
  page_count integer not null default 1,
  source_hash text,
  source_filename text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists av_document_jobs_consumer_time_idx on av_document_jobs(consumer, created_at desc);
create index if not exists av_document_jobs_status_time_idx on av_document_jobs(status, created_at desc);
create index if not exists av_document_jobs_provider_time_idx on av_document_jobs(provider, created_at desc);
create index if not exists av_document_jobs_type_time_idx on av_document_jobs(document_type, created_at desc);
create index if not exists av_document_jobs_hash_idx on av_document_jobs(source_hash);

comment on table av_document_jobs is 'Operational metadata for AV Document Intelligence. Never store original files, OCR text, extracted parties or sensitive document content here.';
comment on column av_document_jobs.metadata is 'Safe aggregate metadata only: field counts, routing data and non-sensitive operational flags.';

alter table av_document_jobs enable row level security;
