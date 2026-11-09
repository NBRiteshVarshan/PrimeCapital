-- Stores the reply language selected by each Telegram chat.
-- Run this once in Supabase SQL Editor before deploying the updated bot.
CREATE TABLE IF NOT EXISTS public.telegram_language_preferences (
    chat_id TEXT PRIMARY KEY,
    preferred_language TEXT NOT NULL CHECK (preferred_language IN ('en', 'hi')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.telegram_language_preferences ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies are intentionally created. Backend access
-- uses the Supabase service-role key, which bypasses RLS.
