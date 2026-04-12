-- All child tables of cleaning_jobs used ON DELETE RESTRICT,
-- blocking deletion when a listing (and its jobs) are removed.
-- Change them all to CASCADE.

ALTER TABLE cleaning_payments
  DROP CONSTRAINT IF EXISTS cleaning_payments_job_id_fkey;
ALTER TABLE cleaning_payments
  ADD CONSTRAINT cleaning_payments_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES cleaning_jobs(id) ON DELETE CASCADE;

ALTER TABLE cleaning_payouts
  DROP CONSTRAINT IF EXISTS cleaning_payouts_job_id_fkey;
ALTER TABLE cleaning_payouts
  ADD CONSTRAINT cleaning_payouts_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES cleaning_jobs(id) ON DELETE CASCADE;

ALTER TABLE cleaning_reviews
  DROP CONSTRAINT IF EXISTS cleaning_reviews_job_id_fkey;
ALTER TABLE cleaning_reviews
  ADD CONSTRAINT cleaning_reviews_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES cleaning_jobs(id) ON DELETE CASCADE;

ALTER TABLE cleaning_disputes
  DROP CONSTRAINT IF EXISTS cleaning_disputes_job_id_fkey;
ALTER TABLE cleaning_disputes
  ADD CONSTRAINT cleaning_disputes_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES cleaning_jobs(id) ON DELETE CASCADE;

ALTER TABLE job_checklist_items
  DROP CONSTRAINT IF EXISTS job_checklist_items_job_id_fkey;
ALTER TABLE job_checklist_items
  ADD CONSTRAINT job_checklist_items_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES cleaning_jobs(id) ON DELETE CASCADE;

ALTER TABLE job_photos
  DROP CONSTRAINT IF EXISTS job_photos_job_id_fkey;
ALTER TABLE job_photos
  ADD CONSTRAINT job_photos_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES cleaning_jobs(id) ON DELETE CASCADE;
