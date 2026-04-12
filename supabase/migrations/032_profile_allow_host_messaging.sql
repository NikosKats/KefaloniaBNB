-- Per-owner flag: super admin can grant/revoke host messaging capability
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS allow_host_messaging boolean NOT NULL DEFAULT false;
