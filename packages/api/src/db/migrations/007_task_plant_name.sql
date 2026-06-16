-- ─── 007: Add plant_name to garden_tasks ─────────────────────────────────────
-- Allows tasks to carry the Hebrew plant name (e.g. "עץ פקאן") for display
-- in the mobile calendar day card alongside the task title.

ALTER TABLE garden_tasks
  ADD COLUMN IF NOT EXISTS plant_name TEXT DEFAULT NULL;
