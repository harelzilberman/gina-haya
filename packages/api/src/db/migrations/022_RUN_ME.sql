-- ════════════════════════════════════════════════════════════════════════════
-- 022_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   Adds per-plant auto-irrigation fields to garden_plants:
--     auto_irrigation BOOLEAN NOT NULL DEFAULT FALSE
--     irrigation_days SMALLINT[] NULL   — which days of week the drip runs
--     irrigation_times TIME[]   NULL    — 1-3 clock times per day (HH:MM)
--
--   Day convention (0-indexed, Sunday-first):
--     0=א (Sunday), 1=ב (Monday), 2=ג (Tuesday), 3=ד (Wednesday),
--     4=ה (Thursday), 5=ו (Friday), 6=ש (Saturday)
--
--   Times are naive local Israel times (no tz) — they describe the drip
--   timer's program; nothing is scheduled off them server-side.
--
-- SAFE TO RE-RUN — every step is idempotent.
--
-- NOTE: The Supabase SQL Editor shows only the LAST statement's result.
-- Run each verification SELECT individually after applying the migration.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Step 1: add the three columns ────────────────────────────────────────────
ALTER TABLE garden_plants
  ADD COLUMN IF NOT EXISTS auto_irrigation BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS irrigation_days SMALLINT[] NULL,
  ADD COLUMN IF NOT EXISTS irrigation_times TIME[]   NULL;

-- ── Step 2: irrigation_times CHECK (1-3 items) ────────────────────────────────
ALTER TABLE garden_plants
  DROP CONSTRAINT IF EXISTS garden_plants_irrigation_times_check;

ALTER TABLE garden_plants
  ADD CONSTRAINT garden_plants_irrigation_times_check
  CHECK (irrigation_times IS NULL OR (cardinality(irrigation_times) BETWEEN 1 AND 3));

-- ── Step 3: irrigation_days CHECK (subset of 0-6, 1-7 unique items) ──────────
ALTER TABLE garden_plants
  DROP CONSTRAINT IF EXISTS garden_plants_irrigation_days_check;

ALTER TABLE garden_plants
  ADD CONSTRAINT garden_plants_irrigation_days_check
  CHECK (
    irrigation_days IS NULL OR (
      irrigation_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
      AND cardinality(irrigation_days) BETWEEN 1 AND 7
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — run each SELECT individually (Editor shows only last result)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Confirm all three columns exist with correct types
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'garden_plants'
  AND  column_name  IN ('auto_irrigation', 'irrigation_days', 'irrigation_times')
ORDER  BY column_name;

-- 2. Confirm irrigation_times CHECK constraint
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'garden_plants'::regclass
  AND  conname  = 'garden_plants_irrigation_times_check';

-- 3. Confirm irrigation_days CHECK constraint
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'garden_plants'::regclass
  AND  conname  = 'garden_plants_irrigation_days_check';

-- 4. Sanity: how many plants currently have auto_irrigation on (expect 0 on first run)
SELECT COUNT(*) AS auto_irrigated_plant_count
FROM   garden_plants
WHERE  auto_irrigation = TRUE;
