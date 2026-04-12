-- Compound indexes for common query patterns that only have single-column indexes.

-- Cleaning requests: filtered by status + ordered by date (admin dashboard, matching)
CREATE INDEX IF NOT EXISTS idx_cleaning_requests_status_date
  ON cleaning_requests(status, requested_date);

-- Cleaning jobs: filtered by status + ordered by date (cleaner dashboard, scheduling)
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_status_date
  ON cleaning_jobs(status, scheduled_date);

-- Profiles: filtered by role (admin user lists, role-based queries)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role);

-- Bookings: lookup by listing + status (owner dashboard, availability checks)
CREATE INDEX IF NOT EXISTS idx_bookings_listing_status
  ON bookings(listing_id, status);

-- Bookings: payout processing queries
CREATE INDEX IF NOT EXISTS idx_bookings_payout_status
  ON bookings(payout_status)
  WHERE payout_status = 'pending';
