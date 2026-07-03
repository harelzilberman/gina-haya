-- ════════════════════════════════════════════════════════════════════════════
-- 019_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   Creates the vision_uses table — a unified log of every vision analysis
--   call across all entry points — used for rolling-month quota enforcement.
--
-- SAFE TO RE-RUN — every step is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Table ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vision_uses (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source           TEXT         NOT NULL CHECK (source IN ('full_diagnosis', 'chat_image', 'tracker_checkin', 'passport_chip')),
  garden_plants_id UUID         REFERENCES garden_plants(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vision_uses_user_month
  ON vision_uses (user_id, created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — check these results before closing the SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- Table exists
SELECT table_name, table_type
FROM   information_schema.tables
WHERE  table_schema = 'public' AND table_name = 'vision_uses';

-- Columns and types
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'vision_uses'
ORDER  BY ordinal_position;

-- FK constraints
SELECT conname, confdeltype
FROM   pg_constraint
WHERE  conrelid = 'vision_uses'::regclass AND contype = 'f'
ORDER  BY conname;

-- CHECK constraint (source enum)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'vision_uses'::regclass AND contype = 'c';

-- Index exists
SELECT indexname, indexdef
FROM   pg_indexes
WHERE  tablename = 'vision_uses';

-- Row count (should be 0 on fresh run)
SELECT COUNT(*) AS row_count FROM vision_uses;
