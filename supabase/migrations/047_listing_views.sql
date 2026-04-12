-- Lightweight listing page view tracking
CREATE TABLE IF NOT EXISTS listing_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer    TEXT,
  country     TEXT,
  session_id  TEXT
);

-- Index for fast per-listing date-range queries
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_date ON listing_views (listing_id, viewed_at DESC);

-- Index for platform-wide date-range aggregations
CREATE INDEX IF NOT EXISTS idx_listing_views_date ON listing_views (viewed_at DESC);

-- RLS: service role only (no public access)
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
