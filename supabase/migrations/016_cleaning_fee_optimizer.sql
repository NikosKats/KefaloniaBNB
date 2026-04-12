-- ============================================================
-- 016_cleaning_fee_optimizer.sql  —  Link cleaning jobs to bookings
-- and track the cleaning fee collected from the guest at booking time
-- ============================================================

ALTER TABLE cleaning_jobs
  ADD COLUMN IF NOT EXISTS booking_id           UUID REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cleaning_fee_collected NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_booking ON cleaning_jobs(booking_id);
