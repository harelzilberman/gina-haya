-- 039_job_runs.sql
-- Run manually in the Supabase SQL Editor.
--
-- PURPOSE: One row per scheduled cron job, serving as both the distributed lock
-- and the heartbeat record. A single atomic conditional UPDATE is used to claim
-- the lock before a job runs, preventing duplicate execution during rolling deploys
-- when two API instances fire the same job at the same wall-clock time.
--
-- LOCKING PATTERN (executed by the job before doing any work):
--
--   UPDATE job_runs
--      SET last_started_at = now(),
--          instance_id     = '<railway_replica_id>',
--          updated_at      = now()
--    WHERE job_name = 'reconcile_play_subs'
--      AND (last_started_at IS NULL
--           OR last_started_at < now() - INTERVAL '1 hour')
--   RETURNING *;
--
-- If the UPDATE returns a row  → this instance holds the lock, proceed.
-- If the UPDATE returns nothing → another instance started within the last hour,
--                                  log and return immediately without running.
--
-- HEARTBEAT: On every exit path (success, no rows to process, error) the job must
-- write last_finished_at + last_status + last_detail. A job that dies silently is
-- indistinguishable from one that ran successfully; the heartbeat is how we tell them apart.

CREATE TABLE IF NOT EXISTS public.job_runs (
  job_name         TEXT        PRIMARY KEY,
  last_started_at  TIMESTAMPTZ,
  last_finished_at TIMESTAMPTZ,
  last_status      TEXT,        -- 'ok' | 'error' | 'skipped'
  last_detail      TEXT,        -- short summary, e.g. "checked=3 changed=0" or error message
  instance_id      TEXT,        -- which process claimed this run (RAILWAY_REPLICA_ID)
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Seed the reconcile job so the row always exists for the claim UPDATE.
-- The claim is a conditional UPDATE — it never inserts — so the row must pre-exist.
INSERT INTO public.job_runs (job_name)
VALUES ('reconcile_play_subs')
ON CONFLICT (job_name) DO NOTHING;

-- ── Verification queries (run after applying) ─────────────────────────────────
--
-- 1. Confirm table and seed row exist
-- SELECT * FROM public.job_runs;
-- expect: one row with job_name = 'reconcile_play_subs' and all other columns null
--
-- 2. Simulate a lock claim (should return the row and update last_started_at)
-- UPDATE public.job_runs
--    SET last_started_at = now(), instance_id = 'test', updated_at = now()
--  WHERE job_name = 'reconcile_play_subs'
--    AND (last_started_at IS NULL OR last_started_at < now() - INTERVAL '1 hour')
-- RETURNING *;
-- expect: 1 row returned
--
-- 3. Simulate a contested claim (run immediately after step 2, should return 0 rows)
-- UPDATE public.job_runs
--    SET last_started_at = now(), instance_id = 'other-instance', updated_at = now()
--  WHERE job_name = 'reconcile_play_subs'
--    AND (last_started_at IS NULL OR last_started_at < now() - INTERVAL '1 hour')
-- RETURNING *;
-- expect: 0 rows returned
