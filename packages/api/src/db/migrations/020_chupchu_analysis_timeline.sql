-- Migration 020: persist Chupchu diagnosis reports in plant_timeline
-- Adds a JSONB content column and extends the entry_type enum to include
-- 'chupchu_analysis' for structured diagnosis payloads.

-- Step 1: add content column for structured JSON payloads
ALTER TABLE plant_timeline
  ADD COLUMN IF NOT EXISTS content JSONB NULL;

-- Step 2: extend entry_type CHECK to include 'chupchu_analysis'
-- Drop the existing auto-named constraint, then recreate with the full list.
ALTER TABLE plant_timeline
  DROP CONSTRAINT IF EXISTS plant_timeline_entry_type_check;

ALTER TABLE plant_timeline
  ADD CONSTRAINT plant_timeline_entry_type_check
  CHECK (entry_type IN (
    'watering', 'fertilizing', 'note', 'photo', 'task',
    'chupchu', 'tracker_report', 'chupchu_analysis'
  ));
