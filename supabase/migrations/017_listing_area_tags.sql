-- ============================================================
-- 017_listing_area_tags.sql — Add area + location_tags to listings
-- area: sub-district/neighborhood within a city (e.g., 'Panagia', 'Golden Beach')
-- location_tags: searchable filter tags (e.g., 'beachfront', 'near-ferry', 'luxury')
-- ============================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS area          TEXT,
  ADD COLUMN IF NOT EXISTS location_tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_listings_area          ON listings(area);
CREATE INDEX IF NOT EXISTS idx_listings_location_tags ON listings USING gin(location_tags);
CREATE INDEX IF NOT EXISTS idx_listings_region        ON listings(region);
CREATE INDEX IF NOT EXISTS idx_listings_city          ON listings(city);
