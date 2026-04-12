-- ============================================================================
-- 052: Restaurant & Technician Social Links + Technician Photos
-- ============================================================================

-- Restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tripadvisor_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_business_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Technicians
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS google_business_url TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS cover_photo TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}'::TEXT[];
