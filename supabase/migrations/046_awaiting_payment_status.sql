-- Add awaiting_payment status for Stripe bookings that haven't been paid yet.
-- These should NOT block dates (guest may abandon checkout).

-- Update check_availability: awaiting_payment bookings don't block dates
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
      AND status IN ('confirmed', 'pending')
      -- awaiting_payment is excluded: guest hasn't paid yet
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
