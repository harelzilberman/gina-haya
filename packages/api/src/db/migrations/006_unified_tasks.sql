-- ─── 006: Unify tasks tables ─────────────────────────────────────────────────
-- Merges the legacy `tasks` table (used by mobile/ChupChu) into `garden_tasks`
-- (used by web/weekly-planner/growth-tracker) so there is one source of truth.

-- STEP 1 — Extend garden_tasks with columns that existed only on `tasks`
ALTER TABLE garden_tasks
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- STEP 2 — Migrate all rows from `tasks` into `garden_tasks`
INSERT INTO garden_tasks (
  id, user_id, title, date, type, status,
  priority, category, completed_at,
  created_at, updated_at, source_action
)
SELECT
  id,
  user_id,
  title,
  COALESCE(due_date::text, CURRENT_DATE::text),
  'custom'                                                          AS type,
  CASE WHEN completed_at IS NULL THEN 'pending' ELSE 'done' END    AS status,
  priority,
  category,
  completed_at,
  created_at,
  created_at                                                        AS updated_at,
  'chupchu'                                                         AS source_action
FROM tasks
ON CONFLICT (id) DO NOTHING;

-- STEP 3 — Drop the now-redundant legacy table
DROP TABLE IF EXISTS tasks;
