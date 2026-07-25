-- DEVELOPMENT ONLY.
-- Remove old analysis snapshots before a clean contract cut in a dev project.
-- This intentionally preserves Supabase Auth users and schema.

truncate table public.analyses;
