-- ─── 032 RUN_ME — paste into Supabase SQL Editor ─────────────────────────────
-- Adds source_timeline_id FK + partial unique index to garden_tasks.
-- Run BEFORE deploying the backend that uses source_timeline_id in
-- POST /api/tasks/bulk — the unique-violation dedup path depends on this index.
--
-- SAFE TO RE-RUN — ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.

ALTER TABLE garden_tasks
  ADD COLUMN IF NOT EXISTS source_timeline_id UUID
  REFERENCES plant_timeline(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_garden_tasks_source
  ON garden_tasks (user_id, source_timeline_id, title)
  WHERE source_timeline_id IS NOT NULL;

-- ── Verification ──────────────────────────────────────────────────────────────

-- 1. Column exists:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'garden_tasks'
  AND column_name  = 'source_timeline_id';

-- 2. Partial unique index exists:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'garden_tasks'
  AND indexname = 'uq_garden_tasks_source';
