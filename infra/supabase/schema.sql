-- Alternative Ventures OS — Data Hub v0.1
create extension if not exists pgcrypto;

create table if not exists av_events (
  id uuid primary key default gen_random_uuid(),
  venture_slug text not null,
  event_name text not null,
  occurred_at timestamptz not null default now(),
  numeric_value numeric,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists av_events_venture_time_idx on av_events(venture_slug, occurred_at desc);
create index if not exists av_events_name_time_idx on av_events(event_name, occurred_at desc);

create table if not exists av_cash_events (
  id uuid primary key default gen_random_uuid(),
  venture_slug text not null,
  kind text not null check (kind in ('revenue','cost')),
  amount_brl numeric(14,2) not null,
  source text not null,
  description text,
  external_reference text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source, external_reference)
);
create index if not exists av_cash_events_time_idx on av_cash_events(occurred_at desc);

create table if not exists av_deals (
  id uuid primary key default gen_random_uuid(),
  venture_slug text not null,
  company text not null,
  contact_name text,
  contact_email text,
  stage text not null check (stage in ('lead','qualified','meeting','proposal','won','lost')),
  value_brl numeric(14,2) not null default 0,
  owner text,
  source text,
  next_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists av_deals_venture_stage_idx on av_deals(venture_slug,stage);

create table if not exists av_contracts (
  id uuid primary key default gen_random_uuid(),
  venture_slug text not null,
  counterparty text not null,
  title text not null,
  status text not null check (status in ('draft','sent','pending','signed','expired')),
  provider text,
  external_reference text,
  document_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists av_incidents (
  id uuid primary key default gen_random_uuid(),
  venture_slug text not null,
  service text not null,
  severity text not null check (severity in ('info','warning','critical')),
  status text not null check (status in ('open','monitoring','resolved')),
  summary text not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

-- AV OS uses the service role server-side. Do not expose these tables directly to clients.
alter table av_events enable row level security;
alter table av_cash_events enable row level security;
alter table av_deals enable row level security;
alter table av_contracts enable row level security;
alter table av_incidents enable row level security;

-- Central de Controle v0.2 (futura sincronização multi-dispositivo)
create table if not exists av_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  venture_slug text,
  account_email text,
  workspace text,
  project text,
  project_ref text,
  console_url text,
  status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists av_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  venture_slug text,
  registrar text,
  account_email text,
  dns_provider text,
  target text,
  renewal_date date,
  auto_renew boolean,
  annual_cost_brl numeric(12,2),
  status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists av_services (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  venture_slug text,
  name text not null,
  environment text,
  url text,
  account_id uuid references av_accounts(id) on delete set null,
  plan text,
  monthly_cost_brl numeric(12,2),
  billing_email text,
  status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists av_secret_refs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venture_slug text,
  provider text,
  stored_in text not null,
  item_reference text,
  last_rotated date,
  expires_at date,
  status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table av_secret_refs is 'Somente localização/metadados. Nunca armazenar senha, token, seed ou chave privada.';

create table if not exists av_implementations (
  id uuid primary key default gen_random_uuid(),
  venture_slug text,
  title text not null,
  status text,
  repo text,
  commit_sha text,
  implemented_at date,
  link text,
  notes text,
  source text default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists av_tasks (
  id uuid primary key default gen_random_uuid(),
  venture_slug text,
  title text not null,
  priority text,
  status text,
  due_date date,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists av_decisions (
  id uuid primary key default gen_random_uuid(),
  venture_slug text,
  title text not null,
  decision_date date,
  rationale text,
  impact text,
  created_at timestamptz not null default now()
);

alter table av_accounts enable row level security;
alter table av_domains enable row level security;
alter table av_services enable row level security;
alter table av_secret_refs enable row level security;
alter table av_implementations enable row level security;
alter table av_tasks enable row level security;
alter table av_decisions enable row level security;
