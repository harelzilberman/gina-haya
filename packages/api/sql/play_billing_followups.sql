-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/qlcaweebrouzfwkumffc/sql/new
--
-- Google Play billing follow-ups (Oct 2026). Safe to re-run.

-- 1. Backfill base_plan_id ('monthly' / 'yearly') on Play rows that predate
--    the fix. The value comes from Google's own response, already stored in
--    raw_notification. Rows whose raw_notification was redacted (deleted
--    accounts) stay NULL.
update public.user_subscriptions
set    base_plan_id = raw_notification->'lineItems'->0->'offerDetails'->>'basePlanId',
       updated_at   = now()
where  platform = 'google_play'
  and  base_plan_id is null
  and  raw_notification->'lineItems'->0->'offerDetails'->>'basePlanId' is not null;

-- Check: each Play row and its base plan.
select id, user_id, product_id, base_plan_id, status, expires_at
from   public.user_subscriptions
where  platform = 'google_play'
order  by created_at desc;

-- 2. The API now writes status = 'pending' for Play payments that have not
--    settled yet. Confirm no CHECK constraint on user_subscriptions.status
--    rejects that value. If a constraint below restricts status and does not
--    list 'pending', it must be widened before deploying.
select conname, pg_get_constraintdef(oid) as definition
from   pg_constraint
where  conrelid = 'public.user_subscriptions'::regclass
  and  contype  = 'c';
