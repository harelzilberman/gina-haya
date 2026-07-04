-- Migration 022: auto-irrigation schedule per plant (garden_plants)
--
-- Day convention (0-indexed, Sunday-first, matching Israel week start):
--   0 = א (Sunday)   1 = ב (Monday)  2 = ג (Tuesday) 3 = ד (Wednesday)
--   4 = ה (Thursday) 5 = ו (Friday)  6 = ש (Saturday)
--
-- Times are naive local Israel times describing the drip timer's program;
-- no timezone handling — nothing is scheduled off them.

ALTER TABLE garden_plants
  ADD COLUMN IF NOT EXISTS auto_irrigation BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS irrigation_days SMALLINT[] NULL,   -- 0=א .. 6=ש
  ADD COLUMN IF NOT EXISTS irrigation_times TIME[]   NULL;    -- 1..3 clock times (HH:MM)

ALTER TABLE garden_plants
  DROP CONSTRAINT IF EXISTS garden_plants_irrigation_times_check;

ALTER TABLE garden_plants
  ADD CONSTRAINT garden_plants_irrigation_times_check
  CHECK (irrigation_times IS NULL OR (cardinality(irrigation_times) BETWEEN 1 AND 3));

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
