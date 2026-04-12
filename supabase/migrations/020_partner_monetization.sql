-- ============================================================
-- Partner Monetization — subscription tiers + discount coupons
-- ============================================================

-- Add subscription fields to partner_businesses
ALTER TABLE partner_businesses
  ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'basic', 'featured')),
  ADD COLUMN monthly_fee       NUMERIC(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'past_due', 'cancelled')),
  ADD COLUMN subscription_started_at TIMESTAMPTZ,
  ADD COLUMN subscription_renews_at  TIMESTAMPTZ,
  ADD COLUMN billing_notes    TEXT;   -- e.g. "pays via Revolut every 1st"

-- Discount coupons per partner business
CREATE TABLE partner_coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES partner_businesses(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,          -- e.g. "AKROGIALI10"
  description     TEXT NOT NULL,          -- e.g. "10% off your meal"
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  NUMERIC(8,2) NOT NULL,  -- 10 = 10% or €10
  valid_until     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  redemption_count INTEGER NOT NULL DEFAULT 0,  -- incremented when guest clicks "I used this"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_partner_coupons_code ON partner_coupons(code);
CREATE INDEX idx_partner_coupons_business ON partner_coupons(business_id);

-- Redemption log (optional tracking — guest clicks "I used this coupon")
CREATE TABLE partner_coupon_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES partner_coupons(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source      TEXT  -- e.g. location slug where guest saw it
);

CREATE INDEX idx_coupon_redemptions_coupon ON partner_coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_business ON partner_coupon_redemptions(business_id, redeemed_at);
