-- 035_add_stripe_customer_id.sql
-- The stripe_customer_id column is referenced throughout billing.ts but was
-- never included in a migration.  Add it now before the Grow integration
-- lands so the column is guaranteed to exist in production.
-- Run manually in Supabase SQL Editor.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
