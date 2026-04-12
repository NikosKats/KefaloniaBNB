-- Migration 004: Add payment_method column to bookings
-- Tracks whether guest chose Stripe card payment or bank transfer

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe', 'bank_transfer'));

COMMENT ON COLUMN bookings.payment_method IS
  'stripe = paid online via Stripe checkout; bank_transfer = approved first then paid by Revolut/Wise/IBAN';

-- Index for filtering bank-transfer bookings pending payment
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method
  ON bookings (payment_method, status, payment_status);
