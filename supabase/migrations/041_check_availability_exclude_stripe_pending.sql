-- Update check_availability to not block dates for unconfirmed Stripe checkouts.
-- Pending Stripe bookings (payment_status='unpaid') are ghost sessions — the guest
-- hasn't paid yet. Only bank_transfer and telegram_direct pending bookings block dates
-- (those require manual owner approval before payment).

CREATE OR REPLACE FUNCTION check_availability(
  p_listing_id UUID,
  p_check_in   DATE,
  p_check_out  DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE listing_id = p_listing_id
      AND (
        status = 'confirmed'
        OR (
          status = 'pending'
          AND NOT (payment_method = 'stripe' AND payment_status = 'unpaid')
        )
      )
      AND check_in  < p_check_out
      AND check_out > p_check_in
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
  ) AND NOT EXISTS (
    SELECT 1 FROM blocked_dates
    WHERE listing_id = p_listing_id
      AND start_date < p_check_out
      AND end_date   > p_check_in
  );
$$;
