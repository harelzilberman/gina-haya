-- ─── 031: recognition_history — add 'linked' status ─────────────────────────
-- A recognition "graduates" to linked when a full diagnosis is run and the
-- plant is added to the user's garden.  garden_plants_id (column already
-- exists) is set at the same time.  The gallery feed can then exclude linked
-- rows with ?exclude=linked so graduated plants don't clutter the feed.
--
-- Change: drop the old status CHECK constraint and re-add it with 'linked'.
-- PostgreSQL auto-names an inline column CHECK as {table}_{column}_check,
-- so the generated name is recognition_history_status_check.
--
-- SAFE TO RE-RUN — DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT IF NOT EXISTS
-- via a DO block makes both steps idempotent.

DO $$
BEGIN
  -- Drop old constraint (tolerates absence — no-op if already dropped)
  ALTER TABLE recognition_history
    DROP CONSTRAINT IF EXISTS recognition_history_status_check;

  -- Add new constraint only if it doesn't already exist with the right values
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
