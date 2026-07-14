-- ─── 026: Soft-delete support for trackers, check-ins, and timeline ──────────
--
-- Context: we had an unexplained wipe of plant_tracker_checkins. Log retention
-- on the free Supabase plan was too short to find the root cause. This migration
-- makes deletions recoverable and leaves an explicit trail.
--
-- Changes:
--   1. Add deleted_at / deleted_by to plant_tracker_checkins
--   2. Add deleted_at / deleted_by to plant_trackers
--   3. Add deleted_at to plant_timeline
--   4. Tighten the tracker_id FK on plant_tracker_checkins from the original
--      (unknown / possibly CASCADE) to ON DELETE SET NULL — so if a tracker row
--      is ever hard-deleted (e.g. via the garden_plants → plant_trackers CASCADE
--      that the Flutter mobile app relies on when deleting a plant directly
--      through the Supabase SDK), the check-in rows are orphaned rather than
--      destroyed.  SET NULL is chosen over RESTRICT so the mobile cascade still
--      works exactly as before; it just stops taking checkins with it.
--   5. Create a generic deletion_audit_log table reusable beyond this feature.
--
-- SAFE TO RE-RUN — all steps are idempotent (IF NOT EXISTS / IF EXISTS guards).
-- NOTE: The paste-ready version for the Supabase SQL Editor is 026_RUN_ME.sql.

-- ── 1. plant_tracker_checkins soft-delete columns ────────────────────────────
ALTER TABLE plant_tracker_checkins
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by  UUID        REFERENCES users(id) ON DELETE SET NULL;

-- ── 2. plant_trackers soft-delete columns ────────────────────────────────────
ALTER TABLE plant_trackers
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by  UUID        REFERENCES users(id) ON DELETE SET NULL;

-- ── 3. plant_timeline soft-delete column ─────────────────────────────────────
ALTER TABLE plant_timeline
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ DEFAULT NULL;

-- ── 4. Tighten tracker_id FK on plant_tracker_checkins → ON DELETE SET NULL ──
-- Drop by the expected auto-generated name first; the DO block catches any
-- alternative name it may have been given if the table was created manually.
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
  FOREIGN KEY (tracker_id) REFERENCES plant_trackers(id) ON DELETE SET NULL;

-- ── 5. Generic deletion audit log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deletion_audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT        NOT NULL,
  row_id     UUID        NOT NULL,
  user_id    UUID,                              -- SET NULL if user is later deleted
  action     TEXT        NOT NULL,              -- 'soft_delete' | 'hard_delete'
  source     TEXT,                              -- route/endpoint name
  metadata   JSONB,                             -- snapshot of key fields at deletion time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
