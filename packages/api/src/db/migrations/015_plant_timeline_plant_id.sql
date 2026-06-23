-- Migration 015: add plant_id to plant_timeline, make tracker_id nullable
-- plant_id is the stable anchor for timeline queries (works with or without a tracker)

-- Step 1: add plant_id column (nullable first, we'll populate then constrain)
ALTER TABLE plant_timeline
  ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES garden_plants(id) ON DELETE CASCADE;

-- Step 2: populate plant_id from plant_trackers for existing rows
UPDATE plant_timeline tl
SET plant_id = gp.id
FROM plant_trackers pt
JOIN garden_plants gp ON gp.plant_id = pt.plant_id AND gp.garden_id = pt.garden_id
WHERE tl.tracker_id = pt.id
  AND tl.plant_id IS NULL;

-- Step 3: make tracker_id nullable
ALTER TABLE plant_timeline
  ALTER COLUMN tracker_id DROP NOT NULL;

-- Step 4: add index on plant_id for fast timeline queries
CREATE INDEX IF NOT EXISTS idx_plant_timeline_plant_id ON plant_timeline(plant_id);

-- Step 5: RLS — allow users to insert/select their own plant_timeline rows by plant_id
-- (existing RLS policies on user_id still apply)
