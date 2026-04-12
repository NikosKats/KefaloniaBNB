-- Add google_place_id to listings for Google review QR codes
ALTER TABLE listings ADD COLUMN IF NOT EXISTS google_place_id TEXT;
