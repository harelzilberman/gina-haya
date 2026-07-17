-- ─── 030: recognition_history + vision_uses retry tracking ─────────────────────
-- Adds two things:
--   1. retry_of_id / is_free_retry columns on vision_uses, enabling the
--      "one free retry per original recognition" quota policy without opening a
--      bypass loop.  Free retries are excluded from the rolling-month count.
--   2. recognition_history table — records every structured plant recognition
--      from the chat image flow.  Enables the Gallery recognition feed and the
--      "טעית בזיהוי" / free retry flow.
--
-- SAFE TO RE-RUN — all statements are idempotent.
--
-- NOTE: The paste-ready version for the Supabase SQL Editor (with live
-- verification queries at the end) is 030_RUN_ME.sql. Run that one.

-- ── Part 1: extend vision_uses with retry tracking ────────────────────────────
-- retry_of_id: FK to the original vision_uses row this retry was triggered from.
-- is_free_retry: when true, this row is excluded from the rolling-month count
--   so the user is not double-charged for a single free retry.
--
-- DEFAULT false keeps all existing rows at the non-free path — backfill is not
-- needed.  ON DELETE SET NULL matches the garden_plants_id FK convention on this
-- same table (usage history survives the referenced row's deletion).
ALTER TABLE vision_uses
  ADD COLUMN IF NOT EXISTS retry_of_id   UUID    REFERENCES vision_uses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_free_retry BOOLEAN NOT NULL DEFAULT false;

-- ── Part 2: recognition_history table ─────────────────────────────────────────
-- One row per recognition attempt (initial or retry).  Not tied to a
-- garden_plants row — photo + result persists even for plants the user never
-- adds to their garden.
--
-- Columns:
--   source            — which entry point produced this recognition
--   photo_storage_key — storage path in tracker-photos bucket (nullable:
--                       upload is best-effort / fire-and-forget)
--   result_json       — the mini-card payload returned to the client
--   confidence        — echoed from result_json for fast index queries
--   garden_plants_id  — populated if user later adds the plant to their garden
--   status            — lifecycle: pending → confirmed | wrong → retried
--   user_hint         — hint typed by the user on retry ("אני חושב שזה עגבנייה")
--   retry_of_id       — FK to the original recognition_history row (max one hop)
--   vision_use_id     — audit link to the quota row that was charged
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

-- Covers GET /api/recognitions (user feed, newest first)
CREATE INDEX IF NOT EXISTS idx_recognition_history_user_created
  ON recognition_history (user_id, created_at DESC);

-- Partial index: only rows that ARE retries — used to enforce one-hop max
CREATE INDEX IF NOT EXISTS idx_recognition_history_retry_of
  ON recognition_history (retry_of_id)
  WHERE retry_of_id IS NOT NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Service-role key (used by the API) bypasses RLS automatically.
-- Client-side callers (if any) are limited to their own rows.
ALTER TABLE recognition_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recognition_history_own_rows"
  ON recognition_history
  FOR ALL
  USING (auth.uid() = user_id);

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- No RLS on the vision_uses columns — vision_uses is a server-side table with
-- no direct client access; the API service role bypasses RLS on every call.
--
-- photo_storage_key is nullable: if the storage upload fails (transient error,
-- bucket quota, network), the recognition result is still persisted without the
-- photo.  The client should handle a null key gracefully (no thumbnail).
--
-- retry_of_id has ON DELETE SET NULL (not CASCADE): if an original recognition
-- row is somehow removed, the retry row stays for audit purposes.
--
-- vision_use_id has ON DELETE SET NULL: usage rows are billing-adjacent and may
-- be purged independently; recognition history should survive that.
