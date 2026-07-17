-- ════════════════════════════════════════════════════════════════════════════
-- 030_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   1. Adds retry_of_id / is_free_retry columns to vision_uses.
--   2. Creates the recognition_history table with RLS.
--
-- IMPORTANT: Run this migration BEFORE deploying the API code that uses it.
-- The API will insert into recognition_history immediately on first image chat.
--
-- SAFE TO RE-RUN — every step is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Part 1: extend vision_uses ────────────────────────────────────────────────
ALTER TABLE vision_uses
  ADD COLUMN IF NOT EXISTS retry_of_id   UUID    REFERENCES vision_uses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_free_retry BOOLEAN NOT NULL DEFAULT false;

-- ── Part 2: recognition_history ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recognition_history (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source            TEXT        NOT NULL CHECK (source IN ('chat_image', 'full_diagnosis')),
  photo_storage_key TEXT,
  result_json       JSONB       NOT NULL,
  confidence        TEXT        CHECK (confidence IN ('high', 'medium', 'low')),
  garden_plants_id  UUID        REFERENCES garden_plants(id) ON DELETE SET NULL,
  status            TEXT        NOT NULL
                    CHECK (status IN ('pending', 'confirmed', 'wrong', 'retried'))
                    DEFAULT 'pending',
  user_hint         TEXT,
  retry_of_id       UUID        REFERENCES recognition_history(id) ON DELETE SET NULL,
  vision_use_id     UUID        REFERENCES vision_uses(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recognition_history_user_created
  ON recognition_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recognition_history_retry_of
  ON recognition_history (retry_of_id)
  WHERE retry_of_id IS NOT NULL;

ALTER TABLE recognition_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recognition_history_own_rows"
  ON recognition_history
  FOR ALL
  USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — check these results before closing the SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- 1. vision_uses now has the two new columns
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'vision_uses'
ORDER  BY ordinal_position;

-- 2. recognition_history table exists
SELECT table_name, table_type
FROM   information_schema.tables
WHERE  table_schema = 'public' AND table_name = 'recognition_history';

-- 3. recognition_history columns
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'recognition_history'
ORDER  BY ordinal_position;

-- 4. FK constraints on recognition_history
SELECT conname, confdeltype
FROM   pg_constraint
WHERE  conrelid = 'recognition_history'::regclass AND contype = 'f'
ORDER  BY conname;

-- 5. CHECK constraints (source + confidence + status enums)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'recognition_history'::regclass AND contype = 'c'
ORDER  BY conname;

-- 6. Indexes exist
SELECT indexname, indexdef
FROM   pg_indexes
WHERE  tablename = 'recognition_history';

-- 7. RLS enabled + policy exists
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'recognition_history';
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'recognition_history';

-- 8. Row count (expect 0 on first run)
SELECT COUNT(*) AS row_count FROM recognition_history;
