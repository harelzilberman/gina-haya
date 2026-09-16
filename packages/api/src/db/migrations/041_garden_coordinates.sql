-- 041_garden_coordinates.sql
-- Run manually in the Supabase SQL Editor.
--
-- PURPOSE: Store exact GPS coordinates per garden so weather, sunrise/sunset,
-- moonrise/moonset, and irrigation timing use the actual garden location rather
-- than a region centroid.  Nullable — existing gardens continue to fall back to
-- the location_region → REGION_COORDS table until a client sets coordinates.
--
-- Resolution order after this migration (enforced in services/weather.ts):
--   1. latitude/longitude if both are non-null → exact Open-Meteo call
--   2. location_region → REGION_COORDS centroid (existing behaviour)
--   3. REGION_COORDS['default'] → Jerusalem (existing default)
--
-- coords_updated_at lets the operator distinguish a never-set garden (NULL)
-- from a stale one, and lets the client tell when coordinates were last written.
--
-- No index: gardens are always looked up by primary key (id) or by user_id,
-- neither of which changes here.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS + DROP/ADD CONSTRAINT IF NOT EXISTS.

ALTER TABLE public.gardens
  ADD COLUMN IF NOT EXISTS latitude           double precision,
  ADD COLUMN IF NOT EXISTS longitude          double precision,
  ADD COLUMN IF NOT EXISTS coords_updated_at  timestamptz;

-- CHECK: valid geographic ranges, NULL-tolerant (NULLs pass any CHECK).
-- Drops and re-adds so the migration is idempotent.
ALTER TABLE public.gardens
  DROP CONSTRAINT IF EXISTS gardens_coords_range_check;

ALTER TABLE public.gardens
  ADD CONSTRAINT gardens_coords_range_check
  CHECK (
    (latitude  IS NULL OR (latitude  BETWEEN -90  AND  90))
    AND
    (longitude IS NULL OR (longitude BETWEEN -180 AND 180))
  );

-- ── Verification queries (run after applying) ─────────────────────────────────
--
-- 1. Confirm the three columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  table_name   = 'gardens'
--   AND  column_name  IN ('latitude', 'longitude', 'coords_updated_at')
-- ORDER  BY column_name;
-- expect: 3 rows; data_type = 'double precision' for lat/lon, 'timestamp with time zone' for coords_updated_at
--
-- 2. Confirm the CHECK constraint exists
-- SELECT conname, consrc
-- FROM   pg_constraint
-- WHERE  conrelid = 'public.gardens'::regclass
--   AND  conname  = 'gardens_coords_range_check';
-- expect: 1 row
--
-- 3. Spot-check: existing rows are unaffected (all NULLs)
-- SELECT COUNT(*) FROM public.gardens WHERE latitude IS NOT NULL;
-- expect: 0
