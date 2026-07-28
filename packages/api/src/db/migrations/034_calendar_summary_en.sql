-- 034_calendar_summary_en.sql
-- Adds an English counterpart to biodynamic_calendar.mon_daily_summary so the
-- Chupchu daily-insight text can render in English for non-Hebrew locales
-- (Flutter app, web dashboard, and daily digest email all read this column).
-- generate_calendar.py now writes both mon_daily_summary and
-- mon_daily_summary_en on every upsert; existing rows will backfill the next
-- time the generator is re-run for their date range.
-- Run manually in Supabase SQL Editor. Safe to re-run.

ALTER TABLE biodynamic_calendar
  ADD COLUMN IF NOT EXISTS mon_daily_summary_en text;
