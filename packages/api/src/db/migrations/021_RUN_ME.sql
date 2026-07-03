-- ════════════════════════════════════════════════════════════════════════════
-- 021_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   Adds soft-archive support to garden_plants via a nullable archived_at
--   timestamp. Archiving sets the timestamp; un-archiving clears it.
--   Nothing is deleted; all FK chains (trackers, tasks, timeline, checkins)
--   remain intact.
--
-- SAFE TO RE-RUN — every step is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Column ────────────────────────────────────────────────────────────────────
ALTER TABLE garden_plants ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- ── Partial index ─────────────────────────────────────────────────────────────
-- Covers the hot query: active plants in a garden (archived_at IS NULL).
CREATE INDEX IF NOT EXISTS idx_garden_plants_archived
  ON garden_plants (garden_id)
  WHERE archived_at IS NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — check these results before closing the SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- Column exists with correct type
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'garden_plants'
  AND  column_name  = 'archived_at';

-- Index exists
SELECT indexname, indexdef
FROM   pg_indexes
WHERE  tablename = 'garden_plants'
  AND  indexname = 'idx_garden_plants_archived';

-- Sanity: how many plants are currently archived (expect 0 on first run)
SELECT COUNT(*) AS archived_plant_count
FROM   garden_plants
WHERE  archived_at IS NOT NULL;

-- Sanity: total plant count
SELECT COUNT(*) AS total_plant_count FROM garden_plants;
