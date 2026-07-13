-- ─── 025: drop wizard_runs ────────────────────────────────────────────────────
-- The AI garden-layout wizard (POST /api/map/:id/wizard) has been retired
-- along with the canvas map UI (/map). wizard_runs was its quota-tracking table.
--
-- Historical state at time of drop:
--   40 rows total, 1 distinct user (dev/test only, 2026-03-22 to 2026-04-18).
--   No real user data.
--
-- No other table holds a foreign key referencing wizard_runs — confirmed by
-- inspection of all migrations and API routes. Safe to drop unconditionally.
--
-- SAFE TO RE-RUN — DROP TABLE IF EXISTS is idempotent.
-- NOTE: The paste-ready version for the Supabase SQL Editor is 025_RUN_ME.sql.

DROP TABLE IF EXISTS public.wizard_runs;
