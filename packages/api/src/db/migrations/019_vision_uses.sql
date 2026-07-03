-- ─── 019: vision_uses — unified vision quota log ─────────────────────────────
-- Records every vision analysis call across all entry points so the monthly
-- rolling quota can be enforced consistently.
--
-- Entry points gated by this table:
--   • POST /api/chupchu/full-diagnosis  → source = 'full_diagnosis'
--   • POST /api/chupchu/chat (imageBase64 present) → source = 'chat_image'
--   • POST /api/trackers/:id/checkin    → source = 'tracker_checkin'
--   • POST /api/chupchu/passport-chip   → source = 'passport_chip'  (Phase 2)
--
-- SAFE TO RE-RUN — all statements are idempotent.
--
-- NOTE: The paste-ready version for the Supabase SQL Editor (with live
-- verification queries at the end) is 019_RUN_ME.sql. Run that one.

-- ── Table ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vision_uses (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source           TEXT         NOT NULL CHECK (source IN ('full_diagnosis', 'chat_image', 'tracker_checkin', 'passport_chip')),
  garden_plants_id UUID         REFERENCES garden_plants(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index covers the rolling-month count query:
--   SELECT COUNT(*) FROM vision_uses WHERE user_id = $1 AND created_at >= $startOfMonth
CREATE INDEX IF NOT EXISTS idx_vision_uses_user_month
  ON vision_uses (user_id, created_at);

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- garden_plants_id is nullable — chat_image turns may not have a plant context.
-- ON DELETE SET NULL (not CASCADE): usage history is billing-adjacent and should
-- survive plant deletion.
--
-- gen_random_uuid() matches the convention used in migrations 010 and 013.
-- uuid-ossp (uuid_generate_v4) is available but gen_random_uuid() is the
-- Supabase-preferred built-in since Postgres 13.
