-- Add guest_token and review_token to bookings for accountless guest management
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_token  UUID DEFAULT gen_random_uuid() NOT NULL,
  ADD COLUMN IF NOT EXISTS review_token UUID DEFAULT gen_random_uuid() NOT NULL;

-- Ensure tokens are unique
CREATE UNIQUE INDEX IF NOT EXISTS bookings_guest_token_idx  ON bookings (guest_token);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_review_token_idx ON bookings (review_token);

-- Cancellation request fields
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancel_requested       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancel_request_reason  TEXT;

-- Token lookup will be done via the service client (bypasses RLS) on the server.
-- No public RLS policy needed — tokens are validated server-side.
