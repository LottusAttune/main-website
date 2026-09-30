-- 2026-09-30 — Row-Level Security switched on for every table.
--
-- ALREADY APPLIED to the live database (run by hand in the Supabase SQL
-- Editor on 2026-09-30). This file is the record of that change so the repo
-- matches the database. Running it again is harmless: enabling RLS on a
-- table that already has it is a no-op.
--
-- Why: Supabase flagged that RLS was off on all public tables, which meant
-- anyone holding the project's public (anon) key could read or change them
-- through Supabase's REST API. The website itself never uses that key.
--
-- What it does to the website: nothing. The site talks to Postgres directly
-- (src/lib/db.ts, POSTGRES_URL) as the `postgres` role, which owns these
-- tables and has BYPASSRLS, so RLS never applies to it. No policies are
-- added on purpose: with RLS on and no policies, the public anon/authenticated
-- roles get zero rows, which is exactly what we want.
--
-- Every NEW table must get the same line in the same change that creates it.

ALTER TABLE IF EXISTS public.settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocked_dates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discount_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gift_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages    ENABLE ROW LEVEL SECURITY;
-- feedback_notes exists in the live database but not in db/schema.sql.
ALTER TABLE IF EXISTS public.feedback_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discovery_calls     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocked_call_times  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_counters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_links       ENABLE ROW LEVEL SECURITY;

-- Undo (only if something ever needs it — replace ENABLE with DISABLE):
--   ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
