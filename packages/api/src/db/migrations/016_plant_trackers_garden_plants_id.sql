-- Migration 016: add garden_plants_id to plant_trackers
-- direct FK to the specific garden_plants row — eliminates runtime join in water/fertilize/photo routes

ALTER TABLE plant_trackers
  ADD COLUMN garden_plants_id UUID REFERENCES garden_plants(id);

CREATE INDEX idx_plant_trackers_garden_plants_id
  ON plant_trackers(garden_plants_id);
