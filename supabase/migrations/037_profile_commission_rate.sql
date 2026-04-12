-- 037_profile_commission_rate.sql
-- Store the owner's default commission rate on their profile.
-- Used at invite time and as the default when creating listings for this owner.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2);
