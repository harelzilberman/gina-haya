-- ─── 029: chat_uses — immutable chat message quota log ────────────────────────
-- Records every accepted text-turn in Chupchu chat so the daily/monthly
-- quota can be enforced even after chat history is deleted.
--
-- Problem solved: POST /api/chupchu/chat previously counted messages by
-- iterating the `messages` JSONB array in chupchu_conversations. Deleting
-- chat history (DELETE /api/chupchu/history) hard-deletes that row, resetting
-- both counters — a full quota bypass once LAUNCH_FREE_MODE is off.
--
-- This table is the billing-adjacent source of truth for chat usage.
-- It is NOT touched by DELETE /api/chupchu/history.
-- Image turns are NOT recorded here — they consume vision quota via vision_uses.
--
-- Modelled on migration 019 (vision_uses). No extra columns needed beyond
-- user_id + created_at: the count query is COUNT(*) WHERE user_id = $1
-- AND created_at >= $startOf[Day|Month].
--
-- SAFE TO RE-RUN — all statements are idempotent.
--
-- NOTE: The paste-ready version for the Supabase SQL Editor (with live
-- verification queries at the end) is 029_RUN_ME.sql. Run that one.

-- ── Table ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_uses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index covers both rolling-day and rolling-month count queries:
--   SELECT COUNT(*) FROM chat_uses WHERE user_id = $1 AND created_at >= $t
CREATE INDEX IF NOT EXISTS idx_chat_uses_user_created
  ON chat_uses (user_id, created_at);

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- No source column: all rows come from POST /api/chupchu/chat (text turns only).
-- If future entry points are added, a source column can be added via ALTER TABLE.
--
-- ON DELETE CASCADE on user_id: if a user is deleted, their usage log goes too.
-- This is correct — the log is quota enforcement data, not billing audit data.
-- (Contrast with vision_uses which uses the same policy.)
--
-- Backfill: existing users' current-month counts start from zero when this
-- table first goes live. Acceptable pre-launch (LAUNCH_FREE_MODE is on anyway).
--
-- Follow-up (not done here):
--   Consolidate vision_uses + chat_uses into one feature_uses table with a
--   `feature` column and a shared enforcement helper.
