-- 040_deletion_requests.sql
-- Run manually in the Supabase SQL Editor.
--
-- WHY: There is currently no durable record of in-app deletion requests. The
-- existing flow requires users to send an email which may be missed. This table
-- creates a queryable queue so the 30-day deletion commitment is trackable and
-- so Play Store's in-app deletion path can be satisfied without relying on an
-- email inbox.
--
-- The row intentionally SURVIVES the deletion it records:
--   ON DELETE SET NULL — not CASCADE. A CASCADE here would erase the queue entry
--   at the exact moment the deletion completes, making the record unverifiable.
--   The same reasoning applies as for user_subscriptions (migration 038).
--
-- user_id is nullable for the same reason: once the user is deleted, user_id
-- becomes NULL, but the email column preserves the original requestor identity
-- for audit purposes.

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text        NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at timestamptz,
  notes        text
);

-- Cheap pending-queue query: ORDER BY requested_at with status filter.
CREATE INDEX IF NOT EXISTS deletion_requests_status_requested_idx
  ON public.deletion_requests(status, requested_at);

-- Prevent two pending rows for the same user_id.
-- NULL user_id (post-deletion orphan rows) is exempt — NULLs are never equal
-- in a unique index, so multiple orphan rows are allowed without conflict.
CREATE UNIQUE INDEX IF NOT EXISTS deletion_requests_user_pending_uniq
  ON public.deletion_requests(user_id)
  WHERE status = 'pending';

-- ── Row-Level Security ────────────────────────────────────────────────────────
--
-- Authenticated users may INSERT and SELECT their own rows only.
-- No UPDATE or DELETE from the client — status changes are operator-only.

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY deletion_requests_insert
  ON public.deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY deletion_requests_select
  ON public.deletion_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── Verification queries (run after applying) ─────────────────────────────────
--
-- 1. Confirm table exists and columns are correct
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'deletion_requests'
-- ORDER BY ordinal_position;
-- expect: 7 rows (id, user_id, email, requested_at, status, completed_at, notes)
--
-- 2. Confirm FK is ON DELETE SET NULL (confdeltype = 'n')
-- SELECT conname, confdeltype
-- FROM pg_constraint
-- WHERE conrelid = 'public.deletion_requests'::regclass AND contype = 'f';
-- expect: one row with confdeltype = 'n'
--
-- 3. Confirm unique partial index exists
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'deletion_requests' AND indexname = 'deletion_requests_user_pending_uniq';
-- expect: 1 row
--
-- 4. Confirm RLS is enabled and policies are present
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'deletion_requests';
-- expect: rowsecurity = true
--
-- SELECT polname, polcmd FROM pg_policies
-- WHERE tablename = 'deletion_requests';
-- expect: deletion_requests_insert (INSERT) and deletion_requests_select (SELECT)
