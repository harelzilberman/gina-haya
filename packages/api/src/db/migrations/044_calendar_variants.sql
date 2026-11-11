-- 044_calendar_variants.sql
-- Run manually in the Supabase SQL Editor.
--
-- PURPOSE: A biodynamic calendar that is correct for every garden's timezone
-- and hemisphere — not only for Israel.
--
-- biodynamic_calendar (one row per date, computed at noon Israel time) is NOT
-- changed: old app versions and the cron/push/email jobs keep reading it.
-- This migration ADDS biodynamic_calendar_variants:
--
--   one row per (date, utc_offset_hours, hemisphere)
--     utc_offset_hours  -12 … +14  (whole hours; half-hour zones round to the
--                                   nearest hour in the API)
--     hemisphere        'north' | 'south'
--   = 54 variants per date, each computed at LOCAL NOON for its offset.
--
-- Southern hemisphere follows the Antipodean convention: ascending and
-- descending are reversed, and planting score, prep recommendations and the
-- daily summaries are derived from the reversed value.
--
--   transitions  jsonb array of events inside the local day [00:00, 24:00),
--                sorted by time. Each: { type, at_utc, local_time, ... } with
--                type sign_change | asc_desc_change | new_moon | full_moon.
--
-- Written by:  python packages/api/scripts/generate_calendar.py --variants
-- Read by:     /api/calendar/* when ?gardenId= or ?tz= is given, and Chupchu.
--
-- Data columns mirror what generate_calendar.py writes to biodynamic_calendar,
-- plus the legacy nullable columns the API maps (node_blackout_*, moonrise…),
-- so both tables share one row → BiodynamicDay mapper.
--
-- Safe to re-run: CREATE … IF NOT EXISTS, policies copied only when missing.

CREATE TABLE IF NOT EXISTS public.biodynamic_calendar_variants (
  date                     date        NOT NULL,
  utc_offset_hours         smallint    NOT NULL CHECK (utc_offset_hours BETWEEN -12 AND 14),
  hemisphere               text        NOT NULL CHECK (hemisphere IN ('north', 'south')),

  -- Day type / sign (Thun, sidereal Fagan/Bradley)
  day_type                 day_type_enum NOT NULL,
  day_type_he              text        NOT NULL DEFAULT '',
  day_type_emoji           text        NOT NULL DEFAULT '',
  moon_sign                text        NOT NULL DEFAULT '',
  moon_sign_he             text        NOT NULL DEFAULT '',
  moon_longitude           numeric(8, 4),
  moon_sign_degree         numeric(5, 2),
  day_type_change_time     timestamptz,

  -- Ascending / descending (hemisphere rule already applied)
  ascending_descending     moon_phase_direction_enum NOT NULL,
  ascending_descending_he  text        NOT NULL DEFAULT '',
  moon_declination         numeric(8, 4),
  phase_transition_time    timestamptz,

  -- Node
  node_active              boolean     NOT NULL DEFAULT false,
  node_degrees_distance    numeric(6, 2),
  node_crossing_time       timestamptz,
  node_blackout_start      timestamptz,
  node_blackout_end        timestamptz,

  -- Phase
  moon_phase               text        NOT NULL DEFAULT '',
  moon_phase_he            text        NOT NULL DEFAULT '',
  moon_phase_pct           numeric(5, 2) NOT NULL DEFAULT 0,
  moon_phase_name          text        NOT NULL DEFAULT '',
  moon_phase_name_he       text        NOT NULL DEFAULT '',
  moon_phase_angle         numeric(6, 2),

  -- Distance / aspects
  perigee_active           boolean     NOT NULL DEFAULT false,
  apogee_active            boolean     NOT NULL DEFAULT false,
  moon_opposite_saturn     boolean     NOT NULL DEFAULT false,

  -- Derived
  planting_score           int         NOT NULL DEFAULT 0 CHECK (planting_score BETWEEN 0 AND 10),
  score_colour             score_colour_enum NOT NULL,
  prep_500_recommended     boolean     NOT NULL DEFAULT false,
  prep_501_recommended     boolean     NOT NULL DEFAULT false,
  cpp_recommended          boolean     NOT NULL DEFAULT false,
  mon_daily_summary        text        NOT NULL DEFAULT '',
  mon_daily_summary_en     text,

  moonrise_time            time,
  moonset_time             time,

  transitions              jsonb       NOT NULL DEFAULT '[]'::jsonb,
  calculated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT biodynamic_calendar_variants_pkey
    PRIMARY KEY (date, utc_offset_hours, hemisphere)
);

-- The primary key enforces UNIQUE (date, utc_offset_hours, hemisphere).
-- Lookups are "this variant, these dates":
CREATE INDEX IF NOT EXISTS biodynamic_calendar_variants_variant_date_idx
  ON public.biodynamic_calendar_variants (utc_offset_hours, hemisphere, date);

-- ── RLS: same as biodynamic_calendar ─────────────────────────────────────────
-- biodynamic_calendar's RLS settings live in Supabase, not in this repo, so
-- copy them: enable RLS if the old table has it, and recreate each of its
-- policies (same name, command, roles, USING / WITH CHECK) when missing.
DO $$
DECLARE
  p record;
  rls_on boolean;
  role_list text;
BEGIN
  SELECT relrowsecurity INTO rls_on
  FROM pg_class WHERE oid = 'public.biodynamic_calendar'::regclass;

  IF rls_on THEN
    EXECUTE 'ALTER TABLE public.biodynamic_calendar_variants ENABLE ROW LEVEL SECURITY';
  END IF;

  FOR p IN
    SELECT * FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'biodynamic_calendar'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'biodynamic_calendar_variants'
        AND policyname = p.policyname
    ) THEN
      SELECT string_agg(quote_ident(r), ', ') INTO role_list FROM unnest(p.roles) AS r;
      EXECUTE format(
        'CREATE POLICY %I ON public.biodynamic_calendar_variants AS %s FOR %s TO %s%s%s',
        p.policyname,
        p.permissive,
        p.cmd,
        role_list,
        CASE WHEN p.qual       IS NOT NULL THEN ' USING (' || p.qual || ')' ELSE '' END,
        CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK (' || p.with_check || ')' ELSE '' END
      );
    END IF;
  END LOOP;
END $$;

-- ── Verification queries (run after applying) ─────────────────────────────────
--
-- 1. Table and key exist
-- SELECT conname FROM pg_constraint
-- WHERE  conrelid = 'public.biodynamic_calendar_variants'::regclass AND contype = 'p';
-- expect: biodynamic_calendar_variants_pkey
--
-- 2. Index exists
-- SELECT indexname FROM pg_indexes
-- WHERE  tablename = 'biodynamic_calendar_variants';
-- expect: biodynamic_calendar_variants_pkey, biodynamic_calendar_variants_variant_date_idx
--
-- 3. RLS matches the old table
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE  relname IN ('biodynamic_calendar', 'biodynamic_calendar_variants');
-- expect: the same relrowsecurity value on both rows
--
-- SELECT tablename, policyname, cmd, roles, qual FROM pg_policies
-- WHERE  tablename IN ('biodynamic_calendar', 'biodynamic_calendar_variants')
-- ORDER  BY policyname, tablename;
-- expect: every biodynamic_calendar policy has a twin on _variants
--
-- 4. After running `generate_calendar.py --variants`: 54 variants per date
-- SELECT date, COUNT(*) FROM public.biodynamic_calendar_variants
-- GROUP  BY date ORDER BY date LIMIT 5;
-- expect: count = 54 on every date
--
-- 5. Spot-check: Sydney (+11, south) vs Israel (+2, north) on the same date —
--    same day_type / moon_sign, opposite ascending_descending (when the
--    declination did not turn between the two local noons)
-- SELECT utc_offset_hours, hemisphere, day_type, moon_sign, ascending_descending, transitions
-- FROM   public.biodynamic_calendar_variants
-- WHERE  date = CURRENT_DATE
--   AND  (utc_offset_hours, hemisphere) IN ((2, 'north'), (11, 'south'));
