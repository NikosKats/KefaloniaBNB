-- Add google_place_id to restaurants for Google review QR codes
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id TEXT;
