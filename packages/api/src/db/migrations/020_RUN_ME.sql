-- ════════════════════════════════════════════════════════════════════════════
-- 020_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   1. Adds a JSONB `content` column to plant_timeline for structured payloads.
--   2. Extends the entry_type CHECK constraint to allow 'chupchu_analysis'
--      (drops the existing auto-named constraint and recreates with full list).
--
-- SAFE TO RE-RUN — every step is idempotent (ADD COLUMN IF NOT EXISTS;
-- DROP CONSTRAINT IF EXISTS; ADD CONSTRAINT with same definition).
--
-- NOTE: The Supabase SQL Editor shows only the LAST statement's result.
-- After running this file, verify each section by running the SELECT
-- statements below one at a time.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Step 1: add content column ────────────────────────────────────────────────
ALTER TABLE plant_timeline
  ADD COLUMN IF NOT EXISTS content JSONB NULL;

-- ── Step 2: find the actual CHECK constraint name (informational) ─────────────
-- On first run you can query this to confirm the name before dropping:
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'plant_timeline'::regclass AND contype = 'c';
-- The auto-generated name from migration 013 is: plant_timeline_entry_type_check

-- ── Step 3: drop the old CHECK constraint and recreate with full list ─────────
ALTER TABLE plant_timeline
  DROP CONSTRAINT IF EXISTS plant_timeline_entry_type_check;

ALTER TABLE plant_timeline
  ADD CONSTRAINT plant_timeline_entry_type_check
  CHECK (entry_type IN (
    'watering', 'fertilizing', 'note', 'photo', 'task',
    'chupchu', 'tracker_report', 'chupchu_analysis'
  ));

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — run these SELECT statements individually after the above
-- (Supabase SQL Editor only shows the last statement's result set)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Confirm content column exists with correct type
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'plant_timeline'
  AND  column_name  = 'content';

-- 2. Confirm CHECK constraint now includes 'chupchu_analysis'
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'plant_timeline'::regclass
  AND  contype  = 'c'
  AND  conname  = 'plant_timeline_entry_type_check';

-- 3. All CHECK constraints on plant_timeline (sanity)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'plant_timeline'::regclass
  AND  contype  = 'c';
