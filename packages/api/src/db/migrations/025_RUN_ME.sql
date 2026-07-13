-- ════════════════════════════════════════════════════════════════════════════
-- 025_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   Drops the wizard_runs table — the quota-tracking table for the now-retired
--   AI garden-layout wizard feature. The canvas map (/map) and wizard UI have
--   been removed from the codebase; this cleans up the orphaned table.
--
--   Historical state: 40 rows, 1 user (dev/test only), 2026-03-22 to 2026-04-18.
--   No real user data. No FK references from any other table.
--
--   NOTE: garden_maps is NOT dropped — it is still actively read by
--   chupchu.ts, dashboard.ts, and journal.ts.
--
-- SAFE TO RE-RUN — DROP TABLE IF EXISTS is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.wizard_runs;

-- ════════════════════════════════════════════════════════════════════════════
-- Verification
-- ════════════════════════════════════════════════════════════════════════════

-- Confirm wizard_runs is gone (should return 0 rows)
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name   = 'wizard_runs';

-- Confirm garden_maps still exists (should return 1 row)
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name   = 'garden_maps';
