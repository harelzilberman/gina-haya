-- ════════════════════════════════════════════════════════════════════════════
-- 029_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   Creates the chat_uses table — an immutable per-message log used to
--   enforce daily/monthly Chupchu text-message quotas independently of
--   chat history (which can be deleted by the user).
--
-- IMPORTANT: Run this migration BEFORE deploying the API code that reads
-- from it. The API will insert into chat_uses immediately on deploy; if
-- the table does not exist the first chat request after deploy will 500.
--
-- SAFE TO RE-RUN — every step is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Table ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_uses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_uses_user_created
  ON chat_uses (user_id, created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — check these results before closing the SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- Table exists
SELECT table_name, table_type
FROM   information_schema.tables
WHERE  table_schema = 'public' AND table_name = 'chat_uses';

-- Columns and types (expect: id uuid, user_id uuid, created_at timestamptz)
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'chat_uses'
ORDER  BY ordinal_position;

-- FK constraint on user_id (expect confdeltype = 'c' = CASCADE)
SELECT conname, confdeltype
FROM   pg_constraint
WHERE  conrelid = 'chat_uses'::regclass AND contype = 'f'
ORDER  BY conname;

-- Index exists
SELECT indexname, indexdef
FROM   pg_indexes
WHERE  tablename = 'chat_uses';

-- Row count (should be 0 on fresh run)
SELECT COUNT(*) AS row_count FROM chat_uses;
