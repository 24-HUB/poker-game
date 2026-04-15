-- =============================================================================
-- Supabase Row Level Security (RLS) Policies
-- Run this in: Supabase Dashboard > SQL Editor
--
-- Architecture note:
--   The server connects to Supabase as the `postgres` (superuser) role via
--   DATABASE_URL. Superuser connections bypass RLS automatically — so all
--   Drizzle ORM queries from the server work without any policies.
--
--   RLS is enabled here to BLOCK direct Data API (PostgREST) access via the
--   `anon` and `authenticated` roles, since we use our own auth system
--   (better-auth) rather than Supabase Auth.
-- =============================================================================

-- -------------------------
-- Enable RLS on all tables
-- -------------------------
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gacha_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collection  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history     ENABLE ROW LEVEL SECURITY;

-- -------------------------
-- No permissive policies are created intentionally.
-- This means anon/authenticated roles (PostgREST Data API) are DENIED all access.
-- The server's postgres role bypasses RLS and retains full access.
-- -------------------------

-- Verify RLS is enabled (run this as a sanity check)
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
