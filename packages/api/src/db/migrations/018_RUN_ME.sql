-- ════════════════════════════════════════════════════════════════════════════
-- 018_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   1. Re-creates plant_trackers.garden_plants_id FK with ON DELETE CASCADE
--      (was NO ACTION — was blocking Flutter from deleting plants).
--   2. Adds garden_tasks.garden_plants_id UUID FK with ON DELETE CASCADE so
--      deleting a plant automatically deletes its tasks.
--   3. Backfills garden_tasks.garden_plants_id from linked tracker rows.
--   4. Deletes orphaned tasks that reference a plant that no longer exists
--      (user-scoped, NOT EXISTS join — no blanket deletes).
--   5. Runs verification queries — check output before closing.
--
-- SAFE TO RE-RUN — every step is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Fix plant_trackers.garden_plants_id FK → ON DELETE CASCADE ─────
-- Primary: drop by the known auto-generated name from migration 016.
ALTER TABLE plant_trackers
  DROP CONSTRAINT IF EXISTS plant_trackers_garden_plants_id_fkey;

-- Safety net: drop any remaining FK on this column with a different name
-- (e.g. if it was ever re-created manually). Uses pg_constraint — more
-- reliable than information_schema for this purpose.
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
-- The preceding DROP guarantees no "constraint already exists" error on re-run.
ALTER TABLE plant_trackers
  ADD CONSTRAINT plant_trackers_garden_plants_id_fkey
  FOREIGN KEY (garden_plants_id) REFERENCES garden_plants(id) ON DELETE CASCADE;

-- ── STEP 2: Add garden_plants_id FK column to garden_tasks ─────────────────
-- Nullable — general tasks (no plant) stay valid. IF NOT EXISTS = idempotent.
ALTER TABLE garden_tasks
  ADD COLUMN IF NOT EXISTS garden_plants_id UUID REFERENCES garden_plants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_garden_tasks_garden_plants_id
  ON garden_tasks (garden_plants_id)
  WHERE garden_plants_id IS NOT NULL;

-- ── STEP 3: Backfill garden_tasks.garden_plants_id from linked tracker ──────
-- Copies tracker's garden_plants_id onto tasks created via that tracker.
-- WHERE gt.garden_plants_id IS NULL makes this a no-op on re-run.
UPDATE garden_tasks gt
SET    garden_plants_id = pt.garden_plants_id
FROM   plant_trackers pt
WHERE  gt.plant_tracker_id = pt.id
  AND  pt.garden_plants_id IS NOT NULL
  AND  gt.garden_plants_id IS NULL;

-- ── STEP 4: One-time orphan cleanup (plant_name-based, user-scoped) ─────────
-- Deletes tasks that name a plant (plant_name IS NOT NULL) but whose plant
-- no longer exists in garden_plants for that user.
--
-- User scope: garden_plants has no direct user_id; resolved via gardens.user_id
-- (confirmed from migration 001 schema).
-- Matching: column-to-column on common_name_he and common_name_en — no Hebrew
-- string literals.
-- Tasks with garden_plants_id already set (from STEP 3) are excluded.
-- General tasks (plant_name IS NULL) are never touched.
-- On re-run: already-deleted orphans are gone — safe no-op.
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

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: Verification — check these results before closing the SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- FK constraints on plant_trackers
-- Expected: plant_trackers_garden_plants_id_fkey → confdeltype = 'c'  (CASCADE)
SELECT conname, confdeltype
FROM   pg_constraint
WHERE  conrelid = 'plant_trackers'::regclass AND contype = 'f'
ORDER  BY conname;

-- FK constraints on garden_tasks
-- Expected: garden_tasks_garden_plants_id_fkey → confdeltype = 'c'  (CASCADE)
--           garden_tasks_plant_tracker_id_fkey  → confdeltype = 'a'  (SET NULL / NO ACTION — correct, keep)
SELECT conname, confdeltype
FROM   pg_constraint
WHERE  conrelid = 'garden_tasks'::regclass AND contype = 'f'
ORDER  BY conname;

-- How many trackers have no garden_plants link (legacy / tracker-only trackers)
SELECT COUNT(*) AS orphaned_tracker_count
FROM   plant_trackers
WHERE  garden_plants_id IS NULL;

-- How many tasks are now linked to a garden_plants row via the new FK
SELECT COUNT(*) AS tasks_with_plant_fk
FROM   garden_tasks
WHERE  garden_plants_id IS NOT NULL;
