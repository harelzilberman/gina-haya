-- ─── 034 RUN_ME — paste into Supabase SQL Editor ─────────────────────────────
-- Adds biodynamic_calendar.mon_daily_summary_en (English counterpart to the
-- existing Hebrew-only mon_daily_summary column).
-- Run BEFORE re-running scripts/generate_calendar.py, or the upsert will
-- silently drop the new field (PostgREST ignores unknown JSON keys on insert
-- unless the column already exists — actually it errors on unknown columns,
-- so this must run first or the whole upsert batch will fail).
--
-- SAFE TO RE-RUN.

ALTER TABLE biodynamic_calendar
  ADD COLUMN IF NOT EXISTS mon_daily_summary_en text;

-- ── Verification ──────────────────────────────────────────────────────────────
-- Run this after the statement above to confirm the column exists:

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'biodynamic_calendar'
  AND column_name = 'mon_daily_summary_en';
