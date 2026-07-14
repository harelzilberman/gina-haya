-- ─── 027: Fix tracker deletion — ON DELETE CASCADE + atomic soft-delete ──────
--
-- Root cause: migration 026 changed plant_tracker_checkins.tracker_id FK to
-- ON DELETE SET NULL, but the column has a NOT NULL constraint (migration 013).
-- When any tracker row is hard-deleted (e.g. via the garden_plants cascade that
-- the web app and Flutter use), Postgres tries to write NULL to a NOT NULL
-- column and raises error 23502.
--
-- Changes:
--   1. Drop & recreate plant_tracker_checkins.tracker_id FK as ON DELETE CASCADE.
--      When a tracker is hard-deleted, its check-in rows go with it.
--   2. Create the delete_tracker() Postgres function, which soft-deletes a
--      tracker and all its children inside a single transaction. The API calls
--      this via rpc() instead of issuing four sequential UPDATE/DELETE calls.
--
-- SAFE TO RE-RUN — all steps are idempotent (IF NOT EXISTS / OR REPLACE guards).
-- NOTE: The paste-ready version for the Supabase SQL Editor is 027_RUN_ME.sql.

-- ── 1. Fix plant_tracker_checkins.tracker_id FK → ON DELETE CASCADE ───────────
-- Drop by the expected auto-generated name first; the DO block catches any
-- alternative name it may have been given (same pattern as migration 026).
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
-- Called from DELETE /api/trackers/:id via db.rpc('delete_tracker', ...).
-- Runs inside a single Postgres transaction; if any statement fails the whole
-- operation rolls back, preventing partially-deleted state.
CREATE OR REPLACE FUNCTION delete_tracker(p_tracker_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Hard-delete garden_tasks linked to this tracker (tasks are not soft-deleted)
  DELETE FROM garden_tasks
  WHERE plant_tracker_id = p_tracker_id
    AND user_id          = p_user_id;

  -- Soft-delete all live check-ins
  UPDATE plant_tracker_checkins
  SET    deleted_at = v_now,
         deleted_by = p_user_id
  WHERE  tracker_id  = p_tracker_id
    AND  user_id     = p_user_id
    AND  deleted_at  IS NULL;

  -- Soft-delete related timeline rows
  UPDATE plant_timeline
  SET    deleted_at = v_now
  WHERE  tracker_id  = p_tracker_id
    AND  user_id     = p_user_id;

  -- Soft-delete the tracker itself
  UPDATE plant_trackers
  SET    deleted_at = v_now,
         deleted_by = p_user_id
  WHERE  id      = p_tracker_id
    AND  user_id = p_user_id;
END;
$$;
