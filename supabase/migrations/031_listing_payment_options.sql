-- Add per-listing payment option flags
-- offer_full_payment: owner accepts full amount paid in advance
-- deposit_percent already controls deposit offering (> 0 = deposit enabled)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS offer_full_payment boolean NOT NULL DEFAULT true;
