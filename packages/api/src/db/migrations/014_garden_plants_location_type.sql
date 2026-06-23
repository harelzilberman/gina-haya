ALTER TABLE garden_plants
  ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'pot',
  ADD COLUMN IF NOT EXISTS location_description TEXT;
