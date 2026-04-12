-- Track when review request email was sent so we never double-send
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;
