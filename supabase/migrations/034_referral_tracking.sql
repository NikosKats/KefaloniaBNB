CREATE TABLE IF NOT EXISTS referral_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code     text NOT NULL,
  landing_page text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_clicks_ref_idx ON referral_clicks(ref_code, created_at DESC);

-- Track which booking came from which referral source
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ref_source text;
