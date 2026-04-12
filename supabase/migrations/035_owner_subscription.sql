-- 035_owner_subscription.sql
-- Add owner subscription fields to profiles.
-- Subscribed owners pay €299/year, get direct-contact badge and 3% commission rate.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_active          boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_expires_at      timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_stripe_customer_id       text,
  ADD COLUMN IF NOT EXISTS subscription_stripe_subscription_id   text;

-- Index for quick expiry checks (e.g. cron cleanup)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires
  ON profiles (subscription_expires_at)
  WHERE subscription_active = true;
