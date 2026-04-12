-- cleaning_jobs.listing_id was RESTRICT, blocking listing deletion.
-- Change to CASCADE so deleting a listing cleans up its jobs automatically.

ALTER TABLE cleaning_jobs
  DROP CONSTRAINT IF EXISTS cleaning_jobs_listing_id_fkey;
ALTER TABLE cleaning_jobs
  ADD CONSTRAINT cleaning_jobs_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- cleaning_requests.listing_id is already CASCADE, but ensure it:
ALTER TABLE cleaning_requests
  DROP CONSTRAINT IF EXISTS cleaning_requests_listing_id_fkey;
ALTER TABLE cleaning_requests
  ADD CONSTRAINT cleaning_requests_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
