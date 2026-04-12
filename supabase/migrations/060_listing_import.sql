-- Add import source tracking to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS import_source_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'manual'
  CHECK (import_source IN ('airbnb', 'booking', 'manual'));

-- Add iCal sync fields
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ical_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ical_last_synced TIMESTAMPTZ;
