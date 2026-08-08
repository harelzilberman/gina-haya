-- 036_user_credits.sql
-- Documentation migration: this table was created manually in Supabase.
-- Safe to run against the live DB — CREATE TABLE IF NOT EXISTS is a no-op when the table exists.

CREATE TABLE IF NOT EXISTS user_credits (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_type text        NOT NULL,   -- 'analysis' | 'tracker' | 'garden'
  total       integer     NOT NULL DEFAULT 0,
  used        integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, credit_type)
);

CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON user_credits(user_id);
