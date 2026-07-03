-- ─── 021: Plant archive ("סיום עונה") ─────────────────────────────────────────
-- Adds soft-archive support to garden_plants.
-- Archiving = setting archived_at. Nothing is deleted; all FKs (timeline,
-- trackers, tasks, checkins) remain intact. Un-archive = clearing archived_at.
--
-- SAFE TO RE-RUN — both statements are idempotent.
--
-- NOTE: The paste-ready version for the Supabase SQL Editor (with live
-- verification queries at the end) is 021_RUN_ME.sql. Run that one.

-- ── Column ─────────────────────────────────────────────────────────────────────
ALTER TABLE garden_plants ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- ── Partial index ──────────────────────────────────────────────────────────────
-- Covers the hot query path: "active plants in a garden"
--   SELECT * FROM garden_plants WHERE garden_id = $1 AND archived_at IS NULL
-- Partial index only stores active rows → smaller, faster than a full index.
CREATE INDEX IF NOT EXISTS idx_garden_plants_archived
  ON garden_plants (garden_id)
  WHERE archived_at IS NULL;
