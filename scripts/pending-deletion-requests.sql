-- pending-deletion-requests.sql
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: list all pending account deletion requests oldest-first with days
--          elapsed, so the 30-day commitment can be checked at a glance.
--
-- IMPORTANT: These are READ-ONLY queries. None modify data.
--
-- The 30-day SLA starts at requested_at.  Any row with days_elapsed >= 30 is
-- overdue and must be actioned immediately with scripts/delete-account.ts.

-- ── 1. Pending requests with age ─────────────────────────────────────────────
SELECT
  id,
  user_id,
  email,
  requested_at,
  EXTRACT(DAY FROM now() - requested_at)::int AS days_elapsed,
  CASE
    WHEN EXTRACT(DAY FROM now() - requested_at) >= 30 THEN '⚠ OVERDUE'
    WHEN EXTRACT(DAY FROM now() - requested_at) >= 25 THEN '! due soon'
    ELSE 'ok'
  END AS sla_status
FROM   public.deletion_requests
WHERE  status = 'pending'
ORDER  BY requested_at;

-- ── 2. Full queue (all statuses) ──────────────────────────────────────────────
SELECT
  id,
  user_id,
  email,
  status,
  requested_at,
  completed_at,
  EXTRACT(DAY FROM
    COALESCE(completed_at, now()) - requested_at
  )::int AS days_to_complete,
  notes
FROM   public.deletion_requests
ORDER  BY requested_at DESC;

-- ── 3. Completion rate summary ────────────────────────────────────────────────
SELECT
  status,
  count(*)                                                         AS total,
  round(avg(EXTRACT(EPOCH FROM completed_at - requested_at) / 86400)::numeric, 1)
                                                                   AS avg_days_to_complete
FROM   public.deletion_requests
GROUP  BY status
ORDER  BY status;

-- ── How to mark a request completed (run after scripts/delete-account.ts) ────
--
-- UPDATE public.deletion_requests
-- SET    status       = 'completed',
--        completed_at = now()
-- WHERE  user_id      = '<uuid>'   -- or: WHERE email = '<email>'
--   AND  status       = 'pending';
--
-- Confirm: SELECT * FROM public.deletion_requests WHERE user_id = '<uuid>';
