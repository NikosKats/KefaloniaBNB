-- ============================================================================
-- 071: Gamification — points ledger, tiers, and welcome rewards
-- ============================================================================
-- Adds a dopamine-driving registration/retention layer on top of existing
-- coupons + partner_coupons + referral systems. See plan file for full context.

-- ── Profiles: denormalised points + tier ────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points_balance INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'bronze'
  CHECK (tier IN ('bronze', 'silver', 'gold'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ;

-- ── Points ledger ───────────────────────────────────────────────────────────
-- Every earn/spend event is a row. Profiles.points_balance is the denormalised
-- sum; the ledger is the source of truth.
CREATE TABLE IF NOT EXISTS user_points_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delta       INT NOT NULL,                    -- positive = earned, negative = spent
  reason      TEXT NOT NULL,                   -- e.g. 'signup', 'email_verified', 'first_favorite', 'referral_converted', 'booking_completed', 'review_submitted'
  ref_id      TEXT,                            -- optional id of related entity (booking.id, referral_code, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON user_points_ledger (user_id, created_at DESC);
-- Prevent duplicate awards for one-shot reasons (e.g. signup bonus, first_favorite).
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_unique_one_shot
  ON user_points_ledger (user_id, reason)
  WHERE reason IN ('signup', 'email_verified', 'profile_photo', 'first_favorite', 'first_booking');

ALTER TABLE user_points_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY points_ledger_read ON user_points_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Writes are service-role only (API routes use the service client).

-- ── Tier thresholds function ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION compute_tier(pts INT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN pts >= 1000 THEN 'gold'
    WHEN pts >= 250  THEN 'silver'
    ELSE 'bronze'
  END;
$$;

-- ── Trigger: update profiles.points_balance + tier when ledger changes ──────
CREATE OR REPLACE FUNCTION update_profile_points() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  uid UUID;
  new_balance INT;
  new_tier TEXT;
  old_tier TEXT;
BEGIN
  uid := COALESCE(NEW.user_id, OLD.user_id);
  SELECT COALESCE(SUM(delta), 0) INTO new_balance FROM user_points_ledger WHERE user_id = uid;
  new_tier := compute_tier(new_balance);
  SELECT tier INTO old_tier FROM profiles WHERE id = uid;
  UPDATE profiles
    SET points_balance = new_balance,
        tier = new_tier,
        tier_updated_at = CASE WHEN old_tier IS DISTINCT FROM new_tier THEN now() ELSE tier_updated_at END
    WHERE id = uid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_points_balance ON user_points_ledger;
CREATE TRIGGER trg_points_balance
  AFTER INSERT OR UPDATE OR DELETE ON user_points_ledger
  FOR EACH ROW EXECUTE FUNCTION update_profile_points();

-- ── Welcome rewards (scratch-card / spin prizes) ────────────────────────────
-- Pre-created at signup in a "locked" state. Revealed after email verify.
CREATE TABLE IF NOT EXISTS welcome_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  prize_tier    TEXT NOT NULL CHECK (prize_tier IN ('small', 'medium', 'large', 'jackpot')),
  coupon_id     UUID REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code   TEXT,                           -- denormalised for quick display
  revealed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL,           -- 72h after reveal window opens
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_welcome_rewards_user ON welcome_rewards (user_id);

ALTER TABLE welcome_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY welcome_rewards_read ON welcome_rewards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ── Tier-gating + flash windows on partner_coupons ──────────────────────────
ALTER TABLE partner_coupons ADD COLUMN IF NOT EXISTS min_tier TEXT
  CHECK (min_tier IS NULL OR min_tier IN ('bronze', 'silver', 'gold'));
ALTER TABLE partner_coupons ADD COLUMN IF NOT EXISTS flash_starts_at TIMESTAMPTZ;
ALTER TABLE partner_coupons ADD COLUMN IF NOT EXISTS flash_ends_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_partner_coupons_flash ON partner_coupons (flash_ends_at)
  WHERE flash_ends_at IS NOT NULL;
