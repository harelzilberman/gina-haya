-- ════════════════════════════════════════════════════════════════════════════
-- 023_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   Adds 'advanced' to the subscription_tier_enum Postgres type.
--   This value is required by the new גנן מתקדם tier introduced in this
--   release.  Without this migration, assigning tier='advanced' to any
--   user row will fail with a constraint violation.
--
-- SAFE TO RE-RUN — ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TYPE public.subscription_tier_enum ADD VALUE IF NOT EXISTS 'advanced' AFTER 'gardener_pro';

-- ════════════════════════════════════════════════════════════════════════════
-- Verification
-- ════════════════════════════════════════════════════════════════════════════

-- Confirm all enum values and their order
SELECT enumlabel, enumsortorder
FROM   pg_enum
WHERE  enumtypid = 'public.subscription_tier_enum'::regtype
ORDER  BY enumsortorder;
