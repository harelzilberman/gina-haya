-- ════════════════════════════════════════════════════════════════════════════
-- 024_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   Creates api_usage — one row per Anthropic API call, recording the real
--   token counts (input, output, cache_creation, cache_read) from response.usage.
--
--   Instrumented call sites:
--     • chupchu_chat         — askChupChu in services/claude.ts (one row per
--                              tool-use iteration, not an aggregate)
--     • vision_tracker_checkin — analyzePlantImage in services/plantVision.ts
--     • vision_full_diagnosis  — POST /api/chupchu/full-diagnosis
--     • vision_chat_image      — POST /api/chupchu/analyze-image (legacy)
--
-- SAFE TO RE-RUN — all statements are idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Step 1: create the table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint               TEXT         NOT NULL,
  model                  TEXT,
  input_tokens           INTEGER,
  output_tokens          INTEGER,
  cache_creation_tokens  INTEGER,
  cache_read_tokens      INTEGER,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Step 2: indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id
  ON api_usage (user_id);

CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint_created
  ON api_usage (endpoint, created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- Verification — run each SELECT individually (Editor shows only last result)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Confirm table exists with correct columns
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'api_usage'
ORDER  BY ordinal_position;

-- 2. Confirm both indexes exist
SELECT indexname, indexdef
FROM   pg_indexes
WHERE  tablename = 'api_usage';
