-- ════════════════════════════════════════════════════════════════════════════
-- 027_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   1. Fixes plant_tracker_checkins.tracker_id FK from ON DELETE SET NULL
--      to ON DELETE CASCADE — eliminates the NOT NULL / SET NULL contradiction
--      that caused Postgres error 23502 whenever a tracker was hard-deleted.
--   2. Creates the delete_tracker() function so the API can soft-delete a
--      tracker and all children inside a single atomic transaction.
--
-- SAFE TO RE-RUN — all steps are idempotent.
-- MUST BE RUN before deploying the corresponding API changes (027 branch).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Fix plant_tracker_checkins.tracker_id FK → ON DELETE CASCADE ───────────
ALTER TABLE plant_tracker_checkins
  DROP CONSTRAINT IF EXISTS plant_tracker_checkins_tracker_id_fkey;

DO $$
DECLARE
  v_name TEXT;
BEGIN
  FOR v_name IN
    SELECT c.conname
    FROM   pg_constraint c
    JOIN   pg_attribute  a ON a.attrelid = c.conrelid
                          AND a.attnum   = ANY(c.conkey)
    WHERE  c.conrelid = 'plant_tracker_checkins'::regclass
      AND  c.contype  = 'f'
      AND  a.attname  = 'tracker_id'
  LOOP
    EXECUTE format('ALTER TABLE plant_tracker_checkins DROP CONSTRAINT %I', v_name);
  END LOOP;
END;
$$;

ALTER TABLE plant_tracker_checkins
  ADD CONSTRAINT plant_tracker_checkins_tracker_id_fkey
  FOREIGN KEY (tracker_id) REFERENCES plant_trackers(id) ON DELETE CASCADE;

-- ── 2. Atomic soft-delete function ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_tracker(p_tracker_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  DELETE FROM garden_tasks
  WHERE plant_tracker_id = p_tracker_id
    AND user_id          = p_user_id;

  UPDATE plant_tracker_checkins
  SET    deleted_at = v_now,
         deleted_by = p_user_id
  WHERE  tracker_id  = p_tracker_id
    AND  user_id     = p_user_id
    AND  deleted_at  IS NULL;

  UPDATE plant_timeline
  SET    deleted_at = v_now
  WHERE  tracker_id  = p_tracker_id
    AND  user_id     = p_user_id;

  UPDATE plant_trackers
  SET    deleted_at = v_now,
         deleted_by = p_user_id
  WHERE  id      = p_tracker_id
    AND  user_id = p_user_id;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — check these results before closing the SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- Confirm FK is now ON DELETE CASCADE (confdeltype = 'c')
SELECT conname, confdeltype, pg_get_constraintdef(oid)
FROM   pg_constraint
WHERE  conrelid = 'plant_tracker_checkins'::regclass AND contype = 'f'
ORDER  BY conname;

-- Confirm the function exists
SELECT proname, prosecdef
FROM   pg_proc
WHERE  proname = 'delete_tracker';
