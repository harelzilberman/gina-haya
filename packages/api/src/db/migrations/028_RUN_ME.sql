-- ════════════════════════════════════════════════════════════════════════════
-- 028_RUN_ME.sql  —  PASTE THIS ENTIRE FILE INTO THE SUPABASE SQL EDITOR
-- ════════════════════════════════════════════════════════════════════════════
-- What this does:
--   Adds 'owner' to the subscription_tier_enum Postgres type.
--   This value is required by the internal owner tier introduced in
--   feat(tiers): add internal owner tier with unlimited limits.
--   Without this migration, assigning tier='owner' to any user row
--   will fail with a constraint violation.
--
-- NOTE: Already applied to production. Run on any fresh DB only.
--
-- SAFE TO RE-RUN — ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TYPE public.subscription_tier_enum ADD VALUE IF NOT EXISTS 'owner' AFTER 'professional';

-- ════════════════════════════════════════════════════════════════════════════
-- Verification
-- ════════════════════════════════════════════════════════════════════════════

-- Confirm all enum values and their order (expect 'owner' last)
SELECT enumlabel, enumsortorder
FROM   pg_enum
WHERE  enumtypid = 'public.subscription_tier_enum'::regtype
ORDER  BY enumsortorder;
