-- 037_user_purchases.sql
-- Documentation migration + adds purchase_token column for Grow webhook dedup.
-- Safe to run against the live DB — IF NOT EXISTS guards are on every statement.

CREATE TABLE IF NOT EXISTS user_purchases (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id       text        NOT NULL,
  quantity         integer     NOT NULL,
  price_paid       numeric     NOT NULL,
  currency         text        NOT NULL DEFAULT 'ILS',
  status           text        NOT NULL DEFAULT 'completed',
  payment_provider text,
  payment_ref      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS user_purchases_user_id_idx ON user_purchases(user_id);

-- purchase_token: Grow transactionId stored here for dedup on the webhook receiver.
-- The ALTER is a no-op if the column already exists.
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS purchase_token text;

-- Partial unique index: enforces uniqueness only for non-null tokens, so rows created
-- before this column was added (purchase_token IS NULL) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS user_purchases_purchase_token_uq
  ON user_purchases(purchase_token)
  WHERE purchase_token IS NOT NULL;
