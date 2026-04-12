-- 015_featured_listings.sql
-- Adds featured_listings table for sponsored listing promotion.
-- A listing can have at most one active featured slot at a time.

CREATE TABLE IF NOT EXISTS featured_listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  owner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active featured row per listing at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_featured_listings_active_listing
  ON featured_listings(listing_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_featured_listings_listing_id  ON featured_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_owner_id    ON featured_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_expires_at  ON featured_listings(expires_at);

-- RLS: service role only (admin-managed)
ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON featured_listings
  FOR ALL USING (true);
