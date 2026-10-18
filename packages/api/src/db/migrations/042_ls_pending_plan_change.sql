-- 042_ls_pending_plan_change.sql
-- Run manually in the Supabase SQL Editor.
--
-- PURPOSE: Scheduled downgrades for Lemon Squeezy subscriptions.
-- When a customer moves to a cheaper plan, Lemon Squeezy is switched to the new
-- variant right away with disable_prorations (they pay the new price from the
-- next renewal, no refund), but the customer KEEPS the plan they already paid for
-- until the period ends. These columns hold that scheduled change:
--
--   pending_tier          tier to switch to at period end (NULL = nothing scheduled)
--   pending_interval      'monthly' | 'yearly'
--   pending_effective_at  when it takes effect (the subscription's renews_at)
--
-- Applied by the API on the renewal webhook (subscription_payment_success /
-- subscription_updated), with GET /api/billing/status as a safety net.
-- While pending, product_id / base_plan_id keep describing the plan the customer
-- currently has access to.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS pending_tier         text,
  ADD COLUMN IF NOT EXISTS pending_interval     text,
  ADD COLUMN IF NOT EXISTS pending_effective_at timestamptz;

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_pending_interval_check;
ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_pending_interval_check
  CHECK (pending_interval IS NULL OR pending_interval IN ('monthly', 'yearly'));

-- Verification: expect 3 rows
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'user_subscriptions'
  AND  column_name LIKE 'pending_%';
