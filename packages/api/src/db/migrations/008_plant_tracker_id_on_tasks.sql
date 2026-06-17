-- ─── 008: Add plant_tracker_id to garden_tasks ───────────────────────────────
-- Links tasks created by the growing tracker to their source tracker.
-- Allows cascade-deleting tasks when a tracker is deleted.

ALTER TABLE garden_tasks
  ADD COLUMN IF NOT EXISTS plant_tracker_id UUID REFERENCES plant_trackers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_garden_tasks_plant_tracker_id
  ON garden_tasks (plant_tracker_id)
  WHERE plant_tracker_id IS NOT NULL;
