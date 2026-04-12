-- Track when a listing was first approved by an admin.
-- NULL = never approved (pending review), non-NULL = has been approved at least once.
-- This prevents deactivated-but-previously-approved listings from reappearing
-- in the "Pending Approval" queue.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Back-fill: any currently active listing is already approved
UPDATE listings SET approved_at = NOW() WHERE is_active = true AND approved_at IS NULL;
