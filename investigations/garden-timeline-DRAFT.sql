-- ============================================================
-- garden-timeline-DRAFT.sql
-- DO NOT RUN — reviewed by owner before any execution.
--
-- See investigations/GARDEN_TIMELINE_DESIGN.md for full rationale,
-- including the follow-up section (Block 3 placement, ON DELETE SET NULL).
--
-- How to run:
--   Paste into Supabase Dashboard → SQL Editor → Run.
--   All statements are idempotent (IF NOT EXISTS).
--   Run the verification query at the bottom after running the forward migration.
--   If it returns 0 rows, everything exists. If it returns rows, re-run the
--   relevant CREATE statements and re-check.
--
-- Reverse migration is at the bottom, commented out.
-- ============================================================

-- ── Forward migration ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS garden_timeline (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which garden this event belongs to.
  -- ON DELETE CASCADE: deleting the garden deletes its entire history.
  garden_id       uuid        NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,

  -- Who recorded the event ("recorder", not "owner").
  -- When a community garden member logs an event, their user_id is stored here.
  -- ON DELETE SET NULL: if the recorder's account is deleted, the event is
  -- preserved with user_id = NULL — the garden's biodynamic history survives
  -- the departure of any individual recorder.
  -- Diverges deliberately from plant_timeline (which uses ON DELETE CASCADE)
  -- because plant_timeline events are personal; garden_timeline events belong
  -- to the garden.
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event classification.
  -- TEXT + CHECK mirrors plant_timeline.entry_type exactly.
  -- To add a value: write a new migration that drops constraint
  -- "garden_timeline_event_type_check" and re-adds it with the expanded list.
  event_type      text        NOT NULL CHECK (event_type IN (
    'bd_prep',       -- biodynamic preparation application (500, 501, 508, compost preps)
    'compost_turn',  -- turning an existing compost pile
    'bed_prep',      -- preparing a bed for planting (digging, amendment, etc.)
    'cover_crop',    -- sowing a cover crop / green manure (zevel yarok)
    'mulching',      -- garden-wide mulching (chipooy karka)
    'pest_treatment' -- garden-wide pest or disease treatment
  )),

  -- ISO calendar date of the event (not the recording time).
  -- Stored as DATE (not TIMESTAMPTZ) so "last applied 500" queries are
  -- day-granular and free from timezone offset artifacts.
  event_date      date        NOT NULL,

  -- Time of day — biodynamic practice specifies dusk for 500, dawn for 501.
  -- English values only; plant_timeline used Hebrew literals which we avoid here.
  time_of_day     text        CHECK (time_of_day IN (
    'dawn',       -- 501 is applied at dawn
    'morning',
    'midday',
    'afternoon',
    'dusk',       -- 500 is applied at dusk
    'night'
  )),

  -- Which biodynamic preparation (non-null only when event_type = 'bd_prep').
  -- Values match BD_PREP_KNOWLEDGE keys in packages/api/src/services/claude.ts.
  prep_name       text        CHECK (
    prep_name IS NULL OR prep_name IN ('500', '501', '508', 'compost', 'green_manure')
  ),

  -- Application quantity in grams (non-null only when relevant to the prep type).
  quantity_grams  numeric     CHECK (quantity_grams IS NULL OR quantity_grams > 0),

  -- Free-text note from the user.
  note            text,

  -- Extension bag for display-only fields (weather, moon phase, etc.).
  -- Never used in WHERE clauses; no index on this column.
  detail          jsonb,

  -- Soft delete — same pattern as plant_timeline post-migration 026.
  -- NULL = active row; non-null = soft-deleted.
  deleted_at      timestamptz,

  -- Server-assigned recording timestamp. Immutable after insert.
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary access pattern: all active events for a garden, ordered by date.
CREATE INDEX IF NOT EXISTS idx_garden_timeline_garden_id
  ON garden_timeline(garden_id)
  WHERE deleted_at IS NULL;

-- Chupchu "last applied" pattern — the query this feature was built to serve:
--   SELECT event_date, time_of_day
--   FROM garden_timeline
--   WHERE garden_id = $1 AND event_type = 'bd_prep' AND prep_name = '500'
--     AND deleted_at IS NULL
--   ORDER BY event_date DESC LIMIT 1;
CREATE INDEX IF NOT EXISTS idx_garden_timeline_bd_prep
  ON garden_timeline(garden_id, prep_name, event_date DESC)
  WHERE event_type = 'bd_prep' AND deleted_at IS NULL;

-- Attribution queries: "what did this user log across gardens"
CREATE INDEX IF NOT EXISTS idx_garden_timeline_user_id
  ON garden_timeline(user_id)
  WHERE deleted_at IS NULL;

-- ── Row-level security ────────────────────────────────────────────────────────
-- RLS is enabled on every table in the live database.
-- The API uses the service-role key and bypasses RLS for all server-side calls.
-- These policies are a backstop against direct PostgREST calls from client tokens.

ALTER TABLE garden_timeline ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access to events in gardens they own.
-- When community garden membership ships, this policy does NOT need to change —
-- membership enforcement happens in checkOwnsGarden() (ownership.ts), which the
-- API calls before every write. This RLS policy only guards direct client access.
CREATE POLICY "garden_timeline_owner_all"
  ON garden_timeline FOR ALL
  TO authenticated
  USING (
    garden_id IN (
      SELECT id FROM gardens WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    garden_id IN (
      SELECT id FROM gardens WHERE user_id = auth.uid()
    )
  );

-- Service role: unrestricted (matches every other table in the live DB).
CREATE POLICY "garden_timeline_service_role_all"
  ON garden_timeline FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Reverse migration ─────────────────────────────────────────────────────────
-- Uncomment and run to undo. Dropping the table drops indexes, policies, and
-- constraints automatically.

-- DROP TABLE IF EXISTS garden_timeline;

-- ── Verification query ────────────────────────────────────────────────────────
-- Run this AFTER the forward migration.
-- Returns 0 rows if everything was created correctly.
-- Returns one row per missing object — re-run the relevant CREATE and re-check.

WITH expected (kind, object_name) AS (
  VALUES
    -- Table
    ('table',   'garden_timeline'),
    -- Columns (checked via information_schema)
    ('column',  'garden_timeline.id'),
    ('column',  'garden_timeline.garden_id'),
    ('column',  'garden_timeline.user_id'),
    ('column',  'garden_timeline.event_type'),
    ('column',  'garden_timeline.event_date'),
    ('column',  'garden_timeline.time_of_day'),
    ('column',  'garden_timeline.prep_name'),
    ('column',  'garden_timeline.quantity_grams'),
    ('column',  'garden_timeline.note'),
    ('column',  'garden_timeline.detail'),
    ('column',  'garden_timeline.deleted_at'),
    ('column',  'garden_timeline.created_at'),
    -- Indexes
    ('index',   'idx_garden_timeline_garden_id'),
    ('index',   'idx_garden_timeline_bd_prep'),
    ('index',   'idx_garden_timeline_user_id'),
    -- RLS policies
    ('policy',  'garden_timeline_owner_all'),
    ('policy',  'garden_timeline_service_role_all'),
    -- RLS enabled
    ('rls',     'garden_timeline')
)
SELECT e.kind, e.object_name, 'MISSING' AS status
FROM expected e
WHERE
  (e.kind = 'table'  AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = e.object_name
  ))
  OR
  (e.kind = 'column' AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = split_part(e.object_name, '.', 1)
      AND column_name = split_part(e.object_name, '.', 2)
  ))
  OR
  (e.kind = 'index'  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = e.object_name
  ))
  OR
  (e.kind = 'policy' AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'garden_timeline' AND policyname = e.object_name
  ))
  OR
  (e.kind = 'rls'    AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relname = e.object_name
      AND  c.relrowsecurity = true
  ));
-- Expected result: 0 rows.
-- If any rows appear, re-run the corresponding CREATE statement and re-check.
