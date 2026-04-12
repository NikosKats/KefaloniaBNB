-- Replace subscription tier model with commission-per-redemption model

ALTER TABLE partner_businesses
  DROP COLUMN IF EXISTS subscription_tier,
  DROP COLUMN IF EXISTS monthly_fee,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_renews_at,
  DROP COLUMN IF EXISTS billing_notes,
  ADD COLUMN commission_per_redemption NUMERIC(8,2) NOT NULL DEFAULT 2.00,
  ADD COLUMN billing_email TEXT;

-- Helper function to increment redemption count atomically
CREATE OR REPLACE FUNCTION increment_coupon_redemption(coupon_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE partner_coupons
  SET redemption_count = redemption_count + 1
  WHERE id = coupon_id;
$$;
