ALTER TABLE plant_tracker_checkins
  ADD COLUMN IF NOT EXISTS suggested_tasks JSONB DEFAULT NULL;

COMMENT ON COLUMN plant_tracker_checkins.suggested_tasks IS
  'Pending suggested tasks from AI analysis. Cleared to NULL after approve-tasks is called.';
