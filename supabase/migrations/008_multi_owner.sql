-- ============================================================
-- Multi-owner platform: property owners, commissions, payouts
-- ============================================================

-- 1. Add property_owner role to profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'super_admin', 'property_owner'));

-- 2. New profile fields for Stripe Connect + contact
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_status   TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (stripe_account_status IN ('not_connected','pending','active','restricted')),
  ADD COLUMN IF NOT EXISTS stripe_onboarding_done  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone                   TEXT,
  ADD COLUMN IF NOT EXISTS bio                     TEXT,
  ADD COLUMN IF NOT EXISTS company_name            TEXT;

-- 3. Add owner_id + per-listing commission override to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS owner_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00;

CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id);

-- 4. Add payout tracking columns to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS platform_fee       DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_payout       DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_status      TEXT NOT NULL DEFAULT 'na'
    CHECK (payout_status IN ('na','pending','transferred','manual_paid')),
  ADD COLUMN IF NOT EXISTS payout_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_at          TIMESTAMPTZ;

-- 5. Platform settings (key/value store, super_admin only)
CREATE TABLE IF NOT EXISTS platform_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default commission rate (10%)
INSERT INTO platform_settings (key, value)
  VALUES ('commission_rate', '10'::jsonb)
  ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'platform_settings_select') THEN
    CREATE POLICY "platform_settings_select" ON platform_settings
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'platform_settings_modify') THEN
    CREATE POLICY "platform_settings_modify" ON platform_settings
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END $$;

-- 6. Tighten listing RLS so property_owners only see their own
--    (drop existing catch-all if present, recreate scoped)
DROP POLICY IF EXISTS "admins_manage_listings" ON listings;

CREATE POLICY "admins_manage_listings" ON listings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('admin', 'super_admin')
          OR (p.role = 'property_owner' AND listings.owner_id = p.id)
        )
    )
  );

-- 7. Tighten booking RLS so property_owners only see bookings for their listings
DROP POLICY IF EXISTS "admins_manage_bookings" ON bookings;

CREATE POLICY "admins_manage_bookings" ON bookings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('admin', 'super_admin')
          OR (
            p.role = 'property_owner'
            AND EXISTS (
              SELECT 1 FROM listings l
              WHERE l.id = bookings.listing_id
                AND l.owner_id = p.id
            )
          )
        )
    )
  );

-- 8. Helper view: owner earnings summary
CREATE OR REPLACE VIEW owner_earnings AS
SELECT
  l.owner_id,
  p.full_name   AS owner_name,
  p.email       AS owner_email,
  COUNT(b.id)   AS total_bookings,
  SUM(b.total_price)   AS gross_revenue,
  SUM(b.platform_fee)  AS total_fees,
  SUM(b.owner_payout)  AS total_payouts,
  SUM(CASE WHEN b.payout_status = 'pending' THEN b.owner_payout ELSE 0 END) AS pending_payout
FROM listings l
JOIN profiles p ON p.id = l.owner_id
LEFT JOIN bookings b ON b.listing_id = l.id
  AND b.payment_status = 'paid'
WHERE l.owner_id IS NOT NULL
GROUP BY l.owner_id, p.full_name, p.email;
