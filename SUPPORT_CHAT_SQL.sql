-- Run this ONCE in your Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It creates the two tables the support chat needs. Everything else in the site
-- deploys through GitHub → Netlify as usual.

CREATE TABLE IF NOT EXISTS public.support_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  username TEXT,
  custom_label TEXT,
  -- 0 = automatic ($200+ rule), 1 = always show, 2 = always hide
  chat_mode SMALLINT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  unread_admin INTEGER NOT NULL DEFAULT 0,
  unread_user INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_thread_idx
  ON public.support_messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS support_threads_last_message_idx
  ON public.support_threads (last_message_at DESC NULLS LAST);

GRANT ALL ON public.support_threads TO service_role;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct client access to support threads" ON public.support_threads;
CREATE POLICY "No direct client access to support threads"
  ON public.support_threads FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct client access to support messages" ON public.support_messages;
CREATE POLICY "No direct client access to support messages"
  ON public.support_messages FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
