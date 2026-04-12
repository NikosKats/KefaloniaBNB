-- 036_owner_show_payment_details.sql
-- Super admin can toggle whether the Bank Transfer & Payment Details section
-- is visible to each owner in their profile. Off by default.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_payment_details boolean NOT NULL DEFAULT false;
