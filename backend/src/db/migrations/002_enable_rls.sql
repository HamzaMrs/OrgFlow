-- 002_enable_rls.sql
-- Enable Row-Level Security on every public table.
--
-- Supabase exposes a public PostgREST API on top of any table in the `public`
-- schema, gated by the project's anon/service-role keys. With RLS off (the
-- default), anyone holding the anon key can read/write the table — and the
-- anon key is typically embedded in any frontend that uses @supabase/supabase-js.
--
-- We don't use the Supabase REST API at all: our backend connects directly to
-- Postgres via DATABASE_URL using the `postgres` role. That role bypasses RLS
-- (`BYPASSRLS` privilege), so flipping RLS on every table will NOT break our
-- backend — it just locks down the secondary API surface.
--
-- No policies are added on purpose: we want a hard "deny-all" via the REST API.
-- If we ever wanted to expose endpoints to the anon key, we'd add CREATE POLICY
-- statements per table.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
