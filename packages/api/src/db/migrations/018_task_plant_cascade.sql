-- ─── 018: Cascade plant deletion through trackers and tasks ──────────────────
-- When a garden_plants row is deleted (directly by the Flutter client via the
-- Supabase SDK, bypassing backend routes), this migration ensures all linked
-- plant_trackers and garden_tasks rows are cleaned up automatically via
-- ON DELETE CASCADE — no application-level intervention required.
--
-- SAFE TO RE-RUN — all steps are idempotent.
--
-- NOTE: The paste-ready version for the Supabase SQL Editor (with live
-- verification queries at the end) is 018_RUN_ME.sql. Run that one.
--
-- Execution order:
--   1. Fix plant_trackers.garden_plants_id FK → ON DELETE CASCADE
--   2. Add garden_plants_id FK column to garden_tasks → ON DELETE CASCADE
--   3. Backfill garden_tasks.garden_plants_id from linked tracker rows
--   4. One-time user-scoped orphan cleanup for plant_name-only task rows

-- ── STEP 1: Fix plant_trackers.garden_plants_id FK ────────────────────────────
-- Migration 016 added this column WITHOUT an ON DELETE clause, so Postgres
-- defaulted to NO ACTION — this blocked the Flutter client from deleting any
-- garden_plants row that had a linked tracker.
--
-- Primary drop: use the known auto-generated constraint name directly.
ALTER TABLE plant_trackers
  DROP CONSTRAINT IF EXISTS plant_trackers_garden_plants_id_fkey;

-- Safety net: drop any remaining FK on garden_plants_id that may have a
-- different name (e.g. re-created manually). Uses pg_constraint for reliability.
DO $$
DECLARE
  v_name TEXT;
BEGIN
  FOR v_name IN
    SELECT c.conname
    FROM   pg_constraint c
    JOIN   pg_attribute  a ON a.attrelid = c.conrelid
                          AND a.attnum   = ANY(c.conkey)
    WHERE  c.conrelid = 'plant_trackers'::regclass
      AND  c.contype  = 'f'
      AND  a.attname  = 'garden_plants_id'
  LOOP
    EXECUTE format('ALTER TABLE plant_trackers DROP CONSTRAINT %I', v_name);
  END LOOP;
END;
$$;

-- Re-add with ON DELETE CASCADE.
-- Previous DROP guarantees no "already exists" conflict on re-run.
ALTER TABLE plant_trackers
  ADD CONSTRAINT plant_trackers_garden_plants_id_fkey
  FOREIGN KEY (garden_plants_id) REFERENCES garden_plants(id) ON DELETE CASCADE;

-- ── STEP 2: Add garden_plants_id FK column to garden_tasks ───────────────────
-- Nullable — general tasks with no plant association remain valid and are
-- never touched by the cascade.
-- ADD COLUMN IF NOT EXISTS is idempotent on re-run.
ALTER TABLE garden_tasks
  ADD COLUMN IF NOT EXISTS garden_plants_id UUID REFERENCES garden_plants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_garden_tasks_garden_plants_id
  ON garden_tasks (garden_plants_id)
  WHERE garden_plants_id IS NOT NULL;

-- ── STEP 3: Backfill garden_tasks.garden_plants_id from linked tracker ────────
-- For tasks created via a tracker (plant_tracker_id IS NOT NULL), copy the
-- tracker's garden_plants_id into the task row where the tracker has one.
-- Tasks whose tracker has garden_plants_id IS NULL (legacy tracker) are left
-- with garden_plants_id NULL and remain unaffected by plant cascades.
-- WHERE gt.garden_plants_id IS NULL makes this a no-op on re-run.
UPDATE garden_tasks gt
SET    garden_plants_id = pt.garden_plants_id
FROM   plant_trackers pt
WHERE  gt.plant_tracker_id = pt.id
  AND  pt.garden_plants_id IS NOT NULL
  AND  gt.garden_plants_id IS NULL;

-- ── STEP 4: One-time orphan cleanup (plant_name-based, user-scoped) ───────────
-- Deletes garden_tasks rows that name a plant (plant_name IS NOT NULL) but have
-- no matching garden_plants row for that user.
--
-- User scope is resolved via gardens.user_id because garden_plants has no
-- direct user_id column (confirmed in migration 001).
--
-- SAFETY rules:
--   • Every DELETE guarded by NOT EXISTS — no blanket deletes.
--   • Only plant_name IS NOT NULL rows are candidates.
--   • Rows already linked via garden_plants_id (STEP 3 backfill) are excluded.
--   • General tasks (plant_name IS NULL) are never touched.
--   • Matching is column-to-column on both common_name_he and common_name_en.
--   • No Hebrew string literals anywhere in this script.
--   • On re-run: orphans already gone, so this is a safe no-op.
DELETE FROM garden_tasks gt
WHERE  gt.plant_name       IS NOT NULL
  AND  gt.garden_plants_id IS NULL
  AND  NOT EXISTS (
         SELECT 1
         FROM   garden_plants gp
         JOIN   gardens       g  ON g.id = gp.garden_id
         WHERE  g.user_id = gt.user_id
           AND  (gp.common_name_he = gt.plant_name
              OR gp.common_name_en = gt.plant_name)
       );
