-- ─── 031 RUN_ME — paste into Supabase SQL Editor ─────────────────────────────
-- Adds 'linked' to the recognition_history.status CHECK constraint.
-- Run BEFORE deploying the backend that uses PATCH /api/recognitions/:id with
-- status='linked' — the DB will reject the value until this migration runs.
--
-- SAFE TO RE-RUN.

DO $$
BEGIN
  ALTER TABLE recognition_history
    DROP CONSTRAINT IF EXISTS recognition_history_status_check;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'recognition_history_status_check'
      AND check_clause LIKE '%linked%'
  ) THEN
    ALTER TABLE recognition_history
      ADD CONSTRAINT recognition_history_status_check
      CHECK (status IN ('pending', 'confirmed', 'wrong', 'retried', 'linked'));
  END IF;
END $$;

-- ── Verification ──────────────────────────────────────────────────────────────
-- Run these after the block above to confirm success.

-- 1. Constraint should list all 5 values:
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name = 'recognition_history_status_check';

-- 2. Smoke-test: this UPDATE should succeed (change it back after if needed):
-- UPDATE recognition_history SET status = 'linked' WHERE false;
