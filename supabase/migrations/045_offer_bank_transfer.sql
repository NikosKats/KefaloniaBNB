-- Add offer_bank_transfer column to decouple bank transfer availability from is_active
ALTER TABLE listings ADD COLUMN IF NOT EXISTS offer_bank_transfer boolean NOT NULL DEFAULT false;

-- Backfill: listings that were active and had deposit or full payment enabled get bank transfer ON
UPDATE listings SET offer_bank_transfer = true
WHERE is_active = true AND (offer_full_payment = true OR deposit_percent > 0);
