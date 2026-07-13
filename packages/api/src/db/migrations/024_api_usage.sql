-- ─── 024: api_usage — Anthropic token / cost log ─────────────────────────────
-- Records the real usage object returned by every Anthropic API call so that
-- per-user and per-endpoint token costs can be queried rather than estimated.
--
-- One row = one Anthropic API call.
-- For agentic loops (chupchu_chat) this means one row per tool-use iteration.
--
-- SAFE TO RE-RUN — all statements are idempotent.
-- NOTE: The paste-ready version for the Supabase SQL Editor (with verification
-- queries) is 024_RUN_ME.sql. Run that one.

-- ── Table ─────────────────────────────────────────────────────────────────────
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

-- Covers per-user cost rollup queries
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id
  ON api_usage (user_id);

-- Covers per-endpoint time-series queries and rolling-window aggregates
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint_created
  ON api_usage (endpoint, created_at);

-- ── Notes ─────────────────────────────────────────────────────────────────────
-- user_id ON DELETE SET NULL (not CASCADE): billing-adjacent data should survive
-- user deletion so historical cost records remain queryable.
--
-- cache_creation_tokens maps to Anthropic's cache_creation_input_tokens field.
-- cache_read_tokens      maps to Anthropic's cache_read_input_tokens field.
--
-- No RLS intentionally: this table is written server-side only via the service
-- role key; end users never read or write it through the client.
