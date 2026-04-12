-- Add telegram_direct as a valid payment_method value
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_method_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_method_check
    CHECK (payment_method IN ('stripe', 'bank_transfer', 'telegram_direct'));
