-- Run in Supabase SQL Editor. Original document files are stored in a PRIVATE bucket.
create extension if not exists pgcrypto;

create table if not exists public.primecapital_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  loan_interest text,
  conversation_summary text,
  channel text not null default 'telegram',
  telegram_chat_id text unique,
  telegram_user_id text,
  telegram_username text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.primecapital_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.primecapital_leads(id) on delete cascade,
  channel text not null default 'telegram',
  telegram_chat_id text,
  storage_path text not null,
  original_filename text,
  document_type text not null default 'UNCLASSIFIED',
  masked_identifier text,
  format_check text not null default 'not_detected',
  review_status text not null default 'pending_human_review'
    check (review_status in ('pending_human_review','approved','rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_primecapital_documents_lead_id
  on public.primecapital_documents(lead_id);
create index if not exists idx_primecapital_leads_status
  on public.primecapital_leads(status, created_at desc);

alter table public.primecapital_leads enable row level security;
alter table public.primecapital_documents enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('primecapital-documents', 'primecapital-documents', false, 8388608,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Do not create anon/authenticated policies for these PII tables or bucket.
-- The backend uses SUPABASE_SERVICE_ROLE_KEY and creates short-lived signed URLs
-- only after the staff API token is validated.
