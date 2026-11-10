-- 043_garden_location_timezone.sql
-- Run manually in the Supabase SQL Editor.
--
-- PURPOSE: Make the garden's saved location the single source of truth for
-- weather, moon and Chupchu, so the platform works for gardeners anywhere in
-- the world — not only in Israel.
--
--   timezone       IANA zone name resolved from the garden coordinates
--                  (e.g. 'Europe/Berlin'). Written by PATCH/POST /api/garden
--                  whenever latitude/longitude are saved. Used for the
--                  Open-Meteo `timezone` parameter instead of a hardcoded
--                  'Asia/Jerusalem'.
--   location_name  Human-readable place name chosen in the city picker
--                  (e.g. 'Gan Hashomron, Israel'). Display only.
--
-- Both nullable. Existing gardens keep NULL until the user sets a location;
-- weather then falls back to location_region → REGION_COORDS → Jerusalem
-- (services/weather.ts), with timezone 'Asia/Jerusalem' for those fallbacks.
--
-- location_region is NOT dropped — new gardens simply stop writing it.
--
-- No index: gardens are always looked up by primary key (id) or by user_id.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.gardens
  ADD COLUMN IF NOT EXISTS timezone       text,
  ADD COLUMN IF NOT EXISTS location_name  text;

-- ── Verification queries (run after applying) ─────────────────────────────────
--
-- 1. Confirm the two columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  table_name   = 'gardens'
--   AND  column_name  IN ('timezone', 'location_name')
-- ORDER  BY column_name;
-- expect: 2 rows; data_type = 'text', is_nullable = 'YES'
--
-- 2. Spot-check: existing rows are unaffected (all NULLs)
-- SELECT COUNT(*) FROM public.gardens WHERE timezone IS NOT NULL OR location_name IS NOT NULL;
-- expect: 0 (immediately after applying)
