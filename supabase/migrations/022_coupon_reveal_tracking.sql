-- Track when guests reveal a coupon code vs when a business confirms it was used
-- Only confirmed reveals are billable redemptions

ALTER TABLE partner_coupons ADD COLUMN IF NOT EXISTS reveal_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS partner_coupon_reveals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID        NOT NULL REFERENCES partner_coupons(id) ON DELETE CASCADE,
  business_id UUID        NOT NULL REFERENCES partner_businesses(id) ON DELETE CASCADE,
  token       TEXT        UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  source      TEXT,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coupon_reveals_token   ON partner_coupon_reveals(token);
CREATE INDEX IF NOT EXISTS idx_coupon_reveals_coupon  ON partner_coupon_reveals(coupon_id);

-- Increment reveal count when guest taps "Show Code"
CREATE OR REPLACE FUNCTION increment_coupon_reveal(p_coupon_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE partner_coupons SET reveal_count = reveal_count + 1 WHERE id = p_coupon_id;
$$;
