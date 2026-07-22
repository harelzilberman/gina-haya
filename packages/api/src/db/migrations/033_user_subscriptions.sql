-- 033_user_subscriptions.sql
-- Stores Play (and future Stripe) subscription records for audit trail.
-- Run manually in Supabase SQL Editor.

CREATE TABLE user_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id),
  platform         text not null,
  purchase_token   text unique,
  product_id       text,
  base_plan_id     text,
  expires_at       timestamptz,
  status           text,
  acknowledged     boolean default false,
  raw_notification jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

CREATE INDEX ON user_subscriptions (user_id);
CREATE INDEX ON user_subscriptions (purchase_token);
