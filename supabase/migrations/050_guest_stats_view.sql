-- ============================================================================
-- 050: Guest Stats View — aggregated guest data from bookings
-- ============================================================================
-- No separate guests table exists; guest identity is derived from guest_email
-- on the bookings table. This view aggregates completed bookings per guest.

-- Ensure index exists for the status + email aggregation
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email_status
  ON bookings (guest_email, status);

-- Materialized-style view (regular view for simplicity — row count is low)
CREATE OR REPLACE VIEW guest_stats AS
SELECT
  guest_email,
  -- Use the most recent name/phone/country (latest booking wins)
  (ARRAY_AGG(guest_name ORDER BY created_at DESC))[1]    AS guest_name,
  (ARRAY_AGG(guest_phone ORDER BY created_at DESC))[1]   AS guest_phone,
  (ARRAY_AGG(guest_country ORDER BY created_at DESC))[1] AS guest_country,
  COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0) AS total_spent,
  COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed'))                       AS bookings_count,
  MAX(created_at) FILTER (WHERE status IN ('confirmed', 'completed'))                AS last_booking_date,
  -- All listing IDs this guest has booked (for property_id filtering)
  ARRAY_AGG(DISTINCT listing_id) FILTER (WHERE status IN ('confirmed', 'completed')) AS listing_ids,
  MIN(created_at) AS first_seen
FROM bookings
WHERE guest_email IS NOT NULL AND guest_email != ''
GROUP BY guest_email;
