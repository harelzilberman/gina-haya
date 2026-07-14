-- ════════════════════════════════════════════════════════════════════════════
-- 026_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   1. Adds deleted_at / deleted_by to plant_tracker_checkins
--   2. Adds deleted_at / deleted_by to plant_trackers
--   3. Adds deleted_at to plant_timeline
--   4. Changes plant_tracker_checkins.tracker_id FK from CASCADE (or whatever
--      it was) to ON DELETE SET NULL — protects check-in data if a tracker
--      row is hard-deleted via the garden_plants cascade (Flutter app).
--   5. Creates deletion_audit_log — generic audit trail for soft-deletes.
--
-- SAFE TO RE-RUN — all steps are idempotent.
-- MUST BE RUN before deploying the corresponding API changes (026 branch).
-- ════════════════════════════════════════════════════════════════════════════

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
  user_id    UUID,
  action     TEXT        NOT NULL,
  source     TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — check these results before closing the SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- Confirm new columns on plant_tracker_checkins (expect deleted_at, deleted_by)
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'plant_tracker_checkins'
  AND  column_name  IN ('deleted_at', 'deleted_by')
ORDER  BY column_name;

-- Confirm new columns on plant_trackers (expect deleted_at, deleted_by)
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'plant_trackers'
  AND  column_name  IN ('deleted_at', 'deleted_by')
ORDER  BY column_name;

-- Confirm new column on plant_timeline (expect deleted_at)
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'plant_timeline'
  AND  column_name  = 'deleted_at';

-- Confirm tracker_id FK is now ON DELETE SET NULL (confdeltype = 'n')
SELECT conname, confdeltype, pg_get_constraintdef(oid)
FROM   pg_constraint
WHERE  conrelid = 'plant_tracker_checkins'::regclass AND contype = 'f'
ORDER  BY conname;

-- Confirm deletion_audit_log exists
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name   = 'deletion_audit_log';
