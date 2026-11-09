-- Run once in the Supabase SQL Editor before deploying the updated backend.
-- Keep the document metadata for a minimal review/audit record; the actual file is deleted.
alter table public.primecapital_documents
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

-- Existing schema already permits pending_human_review, approved, and rejected.
-- No PAN number or raw document content is added to this metadata.
