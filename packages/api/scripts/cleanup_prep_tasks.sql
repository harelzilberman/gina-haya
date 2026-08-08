-- BD Prep cooldown cleanup: remove duplicate garden_tasks
-- Run this once to clean up tasks seeded before cooldown logic was applied.

-- פרפרט 500: keep earliest, delete rows within 28 days of a prior row
DELETE FROM garden_tasks
WHERE id IN (
  SELECT t2.id
  FROM garden_tasks t1
  JOIN garden_tasks t2
    ON t1.user_id = t2.user_id
   AND t1.title LIKE '%פרפרט 500%'
   AND t2.title LIKE '%פרפרט 500%'
   AND t2.date > t1.date
   AND (t2.date::date - t1.date::date) < 28
   AND t2.id <> t1.id
);

-- פרפרט 501: keep earliest, delete rows within 14 days of a prior row
DELETE FROM garden_tasks
WHERE id IN (
  SELECT t2.id
  FROM garden_tasks t1
  JOIN garden_tasks t2
    ON t1.user_id = t2.user_id
   AND t1.title LIKE '%פרפרט 501%'
   AND t2.title LIKE '%פרפרט 501%'
   AND t2.date > t1.date
   AND (t2.date::date - t1.date::date) < 14
   AND t2.id <> t1.id
);

-- CPP: keep earliest, delete rows within 21 days of a prior row
DELETE FROM garden_tasks
WHERE id IN (
  SELECT t2.id
  FROM garden_tasks t1
  JOIN garden_tasks t2
    ON t1.user_id = t2.user_id
   AND (t1.title ILIKE '%cpp%' OR t1.title ILIKE '%cow pat%')
   AND (t2.title ILIKE '%cpp%' OR t2.title ILIKE '%cow pat%')
   AND t2.date > t1.date
   AND (t2.date::date - t1.date::date) < 21
   AND t2.id <> t1.id
);

-- Remove 500 and 501 tasks that fall on the same date (keep 500, drop 501)
DELETE FROM garden_tasks
WHERE id IN (
  SELECT t501.id
  FROM garden_tasks t500
  JOIN garden_tasks t501
    ON t500.user_id = t501.user_id
   AND t500.date = t501.date
   AND t500.title LIKE '%פרפרט 500%'
   AND t501.title LIKE '%פרפרט 501%'
);
