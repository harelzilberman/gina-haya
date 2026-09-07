-- 038_user_subscriptions_set_null.sql
-- Run manually in the Supabase SQL Editor.
--
-- WHY: user_subscriptions.user_id was declared NOT NULL with a bare REFERENCES (no ON DELETE
-- clause), which defaults to NO ACTION. This blocks deletion of any public.users row that has
-- subscription records, aborting the entire auth.users cascade and leaving the account alive.
-- Subscription history is retained for accounting; only the link to the person is severed.
--
-- THREE steps must happen in this order:
--   1. Drop NOT NULL — SET NULL cannot fire against a NOT NULL column. Without this the
--      constraint is recreated successfully but then silently fails at deletion time.
--   2. Drop the old FK.
--   3. Recreate it with ON DELETE SET NULL.

-- Step 1: allow NULLs in user_id
ALTER TABLE public.user_subscriptions
  ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: drop the old FK (NO ACTION default)
ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT user_subscriptions_user_id_fkey;

-- Step 3: recreate with ON DELETE SET NULL
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL;

-- ── Verification queries (run after applying) ────────────────────────────────
--
-- 1. Confirm confdeltype = 'n' (SET NULL)
-- select conname, confdeltype from pg_constraint
-- where conrelid = 'public.user_subscriptions'::regclass and contype = 'f';
-- expect confdeltype = 'n'
--
-- 2. Confirm user_id is now nullable
-- select column_name, is_nullable from information_schema.columns
-- where table_schema = 'public' and table_name = 'user_subscriptions'
--   and column_name = 'user_id';
-- expect is_nullable = 'YES'
