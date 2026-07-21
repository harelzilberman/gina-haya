-- ============================================================
-- READ-ONLY DIAGNOSTIC QUERIES — DO NOT MODIFY ANY DATA
-- Purpose: identify recognition_history rows that may have been
--          incorrectly linked to garden_plants despite being
--          superseded by a retry or marked as wrong/retried.
-- Run against a read replica or with a read-only role.
-- ============================================================

-- Query 1: recognition_history rows that are 'linked' but belong to a
-- retry chain where a sibling was marked 'wrong' or 'retried'.
-- These are recognitions that got linked even after being superseded.
SELECT
  rh.id                  AS recognition_id,
  rh.user_id,
  rh.status              AS current_status,
  rh.garden_plants_id    AS linked_plant_id,
  rh.retry_of_id,
  rh.vision_use_id,
  rh.created_at,
  sibling.id             AS sibling_id,
  sibling.status         AS sibling_status
FROM recognition_history rh
LEFT JOIN recognition_history sibling
  ON sibling.retry_of_id = rh.id
     OR sibling.vision_use_id = rh.vision_use_id
WHERE rh.status = 'linked'
  AND rh.garden_plants_id IS NOT NULL
  AND sibling.status IN ('wrong', 'retried')
ORDER BY rh.created_at DESC;

-- Query 2: garden_plants rows whose display name or species matches a
-- recognition that was later marked wrong or retried.
-- NOTE: This query assumes garden_plants has a 'recognition_id' foreign
-- key or 'source_recognition_id' column linking back to recognition_history.
-- If no such column exists, this query cannot be run as-is — add a
-- source_recognition_id column to garden_plants to enable this audit.
SELECT
  gp.id                  AS garden_plant_id,
  gp.user_id,
  gp.name                AS plant_name,
  rh.id                  AS recognition_id,
  rh.status              AS recognition_status,
  rh.created_at          AS recognized_at
FROM garden_plants gp
JOIN recognition_history rh
  ON rh.garden_plants_id = gp.id
WHERE rh.status IN ('wrong', 'retried')
ORDER BY rh.created_at DESC;
