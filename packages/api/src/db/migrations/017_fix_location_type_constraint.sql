-- Migration 017: fix plant_trackers_location_type_check constraint
-- Old constraint allowed stale values (balcony, other) and was missing current canonical
-- types (bed, hydroponic). Update to match the 5 canonical location types used by the app:
-- pot, garden, bed, hydroponic, greenhouse.

ALTER TABLE plant_trackers
  DROP CONSTRAINT IF EXISTS plant_trackers_location_type_check;

ALTER TABLE plant_trackers
  ADD CONSTRAINT plant_trackers_location_type_check
  CHECK (location_type = ANY (ARRAY['pot'::text, 'garden'::text, 'bed'::text, 'hydroponic'::text, 'greenhouse'::text]));
