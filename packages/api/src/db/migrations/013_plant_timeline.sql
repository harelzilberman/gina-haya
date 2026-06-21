CREATE TABLE IF NOT EXISTS plant_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracker_id UUID NOT NULL REFERENCES plant_trackers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'watering', 'fertilizing', 'note', 'photo', 'task', 'chupchu', 'tracker_report'
  )),
  time_of_day TEXT CHECK (time_of_day IN ('בוקר', 'צהריים', 'ערב', 'לילה')),
  note TEXT,
  photo_path TEXT,
  task_id UUID,
  tracker_checkin_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plant_timeline_tracker_id
  ON plant_timeline(tracker_id);

CREATE INDEX IF NOT EXISTS idx_plant_timeline_user_id
  ON plant_timeline(user_id);

ALTER TABLE plant_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own timeline"
  ON plant_timeline FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all timeline"
  ON plant_timeline FOR ALL TO service_role
  USING (true) WITH CHECK (true);
