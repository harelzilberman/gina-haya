-- ─── 018: Cascade plant deletion through trackers and tasks ──────────────────
-- When a garden_plants row is deleted (directly by the Flutter client via the
-- Supabase SDK, bypassing backend routes), this migration ensures all linked
-- plant_trackers and garden_tasks rows are cleaned up automatically via
-- ON DELETE CASCADE — no application-level intervention required.
--
-- Execution order:
--   1. Fix plant_trackers.garden_plants_id FK → ON DELETE CASCADE
--   2. Add garden_plants_id FK column to garden_tasks → ON DELETE CASCADE
--   3. Backfill garden_tasks.garden_plants_id from linked tracker rows
--   4. One-time user-scoped orphan cleanup for plant_name-only task rows
--   5. (Informational comment) Count legacy trackers with no garden_plants link

-- ── STEP 1: Fix plant_trackers.garden_plants_id FK ────────────────────────────
-- Migration 016 added the column WITHOUT an ON DELETE clause, so Postgres
-- defaulted to NO ACTION (blocks deletes of referenced garden_plants rows).
-- Drop by column pattern (not hardcoded name) so this is safe if the
-- constraint was ever renamed or re-created manually.
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON  tc.constraint_name = kcu.constraint_name
    AND tc.table_schema    = kcu.table_schema
    AND tc.table_name      = kcu.table_name
  WHERE tc.table_schema    = 'public'
    AND tc.table_name      = 'plant_trackers'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name    = 'garden_plants_id';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE plant_trackers DROP CONSTRAINT %I', v_constraint);
  END IF;
END;
$$;

ALTER TABLE plant_trackers
  ADD CONSTRAINT plant_trackers_garden_plants_id_fkey
  FOREIGN KEY (garden_plants_id) REFERENCES garden_plants(id) ON DELETE CASCADE;

-- ── STEP 2: Add garden_plants_id FK column to garden_tasks ───────────────────
-- Nullable — general tasks with no plant association remain valid and are
-- never touched by the cascade.
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
UPDATE garden_tasks gt
SET    garden_plants_id = pt.garden_plants_id
FROM   plant_trackers pt
WHERE  gt.plant_tracker_id  = pt.id
  AND  pt.garden_plants_id  IS NOT NULL
  AND  gt.garden_plants_id  IS NULL;

-- ── STEP 4: One-time orphan cleanup (plant_name-based, user-scoped) ───────────
-- Deletes garden_tasks rows that name a plant (plant_name IS NOT NULL) but have
-- no matching garden_plants row for that user. The join to gardens resolves the
-- user scope (garden_plants has no direct user_id column).
--
-- SAFETY rules applied:
--   • Every DELETE is guarded by a NOT EXISTS join — no blanket deletes.
--   • Only rows where plant_name IS NOT NULL are candidates.
--   • Rows already linked via garden_plants_id (from STEP 3 backfill) are
--     excluded — they are properly tracked and will cascade on plant delete.
--   • General tasks (plant_name IS NULL AND plant_tracker_id IS NULL) are
--     never touched.
--   • All matching uses both common_name_he AND common_name_en columns to
--     avoid false deletions. No Hebrew string literals are used in this SQL.
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

-- ── STEP 5 (informational — rows NOT deleted) ─────────────────────────────────
-- Run this SELECT in the Supabase SQL Editor after applying this migration to
-- see how many plant_trackers rows have no garden_plants link (legacy trackers
-- created before migration 016 or without a garden_plants association).
-- These rows keep working normally; no product decision has been made to
-- remove them.
/*
SELECT COUNT(*) AS orphaned_tracker_count
FROM plant_trackers
WHERE garden_plants_id IS NULL;
*/
