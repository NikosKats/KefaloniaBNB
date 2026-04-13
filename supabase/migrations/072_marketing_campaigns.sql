-- ============================================================================
-- 072: Marketing Campaigns
-- ============================================================================
-- Stores ad/marketing campaigns. Each campaign has a unique ref_code that ties
-- into the existing referral_clicks tracking (middleware reads ?ref= and writes
-- a row in referral_clicks). This means click stats come "for free" from the
-- existing /admin/referrals dashboard logic.

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  ref_code        TEXT NOT NULL UNIQUE,                    -- e.g. 'spring-flyer-2026'
  channel         TEXT NOT NULL CHECK (channel IN ('flyer','qr','social','email','print','partner','other')),
  target_url      TEXT NOT NULL,                           -- where the ?ref=… link points
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  description     TEXT,                                    -- internal note
  -- Flyer fields (for printable assets)
  flyer_headline  TEXT,
  flyer_subhead   TEXT,
  flyer_offer     TEXT,                                    -- e.g. "Free welcome gift on signup 🎁"
  flyer_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_active ON marketing_campaigns (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_channel ON marketing_campaigns (channel);

-- Service-role only writes (admin API). Reads via service client too.
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
