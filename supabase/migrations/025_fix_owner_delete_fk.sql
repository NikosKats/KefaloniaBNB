-- Fix FK constraints that block owner deletion.
-- cleaning_requests, cleaning_jobs, cleaning_reviews, and cleaning_disputes
-- all reference auth.users(id) without ON DELETE handling, causing a FK
-- violation when an owner user is deleted.
-- Make owner_id / reviewer_id / raised_by nullable and use SET NULL.

-- cleaning_requests.owner_id
ALTER TABLE cleaning_requests
  DROP CONSTRAINT IF EXISTS cleaning_requests_owner_id_fkey;
ALTER TABLE cleaning_requests
  ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE cleaning_requests
  ADD CONSTRAINT cleaning_requests_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- cleaning_jobs.owner_id
ALTER TABLE cleaning_jobs
  DROP CONSTRAINT IF EXISTS cleaning_jobs_owner_id_fkey;
ALTER TABLE cleaning_jobs
  ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE cleaning_jobs
  ADD CONSTRAINT cleaning_jobs_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- cleaning_reviews.reviewer_id
ALTER TABLE cleaning_reviews
  DROP CONSTRAINT IF EXISTS cleaning_reviews_reviewer_id_fkey;
ALTER TABLE cleaning_reviews
  ALTER COLUMN reviewer_id DROP NOT NULL;
ALTER TABLE cleaning_reviews
  ADD CONSTRAINT cleaning_reviews_reviewer_id_fkey
    FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- cleaning_disputes.raised_by
ALTER TABLE cleaning_disputes
  DROP CONSTRAINT IF EXISTS cleaning_disputes_raised_by_fkey;
ALTER TABLE cleaning_disputes
  ALTER COLUMN raised_by DROP NOT NULL;
ALTER TABLE cleaning_disputes
  ADD CONSTRAINT cleaning_disputes_raised_by_fkey
    FOREIGN KEY (raised_by) REFERENCES auth.users(id) ON DELETE SET NULL;
