-- 045_node_exact_and_daily_summary.sql
-- Run manually in the Supabase SQL Editor. Idempotent: safe to run twice.
--
-- PURPOSE: round 3 of making Gina Haya work worldwide.
--
-- 1. biodynamic_calendar_variants.node_exact_utc
--    The exact moment (UTC) the moon crosses its ascending or descending
--    lunar node, nearest to the variant day's local noon, when it lies within
--    ±NODE_BLACKOUT_HOURS (24 h). NULL when no node is that close.
--    The API derives nodeBlackoutStart/End = node_exact_utc ± NODE_BLACKOUT_HOURS/2
--    (±12 h), so a blackout that starts the evening before (or ends the
--    morning after) is visible on both days.
--    Written by: python packages/api/scripts/generate_calendar.py --variants
--    (the node moment of the day itself is also in transitions, type 'node').
--
-- 2. users.last_daily_summary_date
--    The user's home-zone local date ("YYYY-MM-DD") of the last daily-summary
--    push that was sent successfully. The daily-summary cron runs every 15
--    minutes (UTC) and sends at 07:00 local time only when this differs from
--    today's local date — prevents double sends across ticks, restarts and
--    replicas.
--
-- Nothing else changes. biodynamic_calendar (legacy, Israel) is untouched.

ALTER TABLE public.biodynamic_calendar_variants
  ADD COLUMN IF NOT EXISTS node_exact_utc timestamptz;

COMMENT ON COLUMN public.biodynamic_calendar_variants.node_exact_utc IS
  'Lunar node crossing nearest to local noon within ±24 h (UTC). Blackout = ±12 h around it. Written by generate_calendar.py --variants.';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_daily_summary_date date;

COMMENT ON COLUMN public.users.last_daily_summary_date IS
  'Home-zone local date of the last daily-summary push sent successfully (daily-summary cron de-duplication).';

-- ── Verification ─────────────────────────────────────────────────────────────
--
-- 1. Columns exist with the right types
-- SELECT table_name, column_name, data_type
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  (table_name, column_name) IN (('biodynamic_calendar_variants', 'node_exact_utc'),
--                                      ('users', 'last_daily_summary_date'));
-- expect: node_exact_utc | timestamp with time zone
--         last_daily_summary_date | date
--
-- 2. After the next "Calendar" GitHub Action run: node moments are present,
--    about two per lunar month, and each falls on a 'node' transition
-- SELECT date, node_exact_utc, node_active, transitions
-- FROM   public.biodynamic_calendar_variants
-- WHERE  utc_offset_hours = 2 AND hemisphere = 'north'
--   AND  node_exact_utc IS NOT NULL
-- ORDER  BY date LIMIT 10;
-- expect: node_exact_utc on ~2 consecutive dates around each crossing
--         (e.g. 2026-11-17 11:48 UTC — ascending node)
--
-- 3. The daily-summary de-duplication column is being written
--    (after 07:00 local for users with tasks and push enabled)
-- SELECT id, last_daily_summary_date FROM public.users
-- WHERE  last_daily_summary_date IS NOT NULL
-- ORDER  BY last_daily_summary_date DESC LIMIT 10;
