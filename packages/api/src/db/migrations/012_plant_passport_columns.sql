-- Add missing plant passport fields to plant_trackers table
ALTER TABLE plant_trackers
  ADD COLUMN IF NOT EXISTS variety TEXT,
  ADD COLUMN IF NOT EXISTS sun_exposure TEXT,
  ADD COLUMN IF NOT EXISTS companions TEXT,
  ADD COLUMN IF NOT EXISTS soil TEXT,
  ADD COLUMN IF NOT EXISTS last_watered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS watering_count INTEGER DEFAULT 0;
