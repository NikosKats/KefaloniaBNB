-- ============================================================================
-- 054: Member Profiles — extended fields + member role
-- ============================================================================

-- Add 'member' to the role check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'super_admin', 'property_owner', 'cleaner', 'member', 'restaurant_owner'));

-- Extended profile fields for community members
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;          -- where they live now
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hometown TEXT;          -- where they're from
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo TEXT;       -- profile cover/banner
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Index for admin member listing
CREATE INDEX IF NOT EXISTS idx_profiles_members ON profiles (role, created_at DESC) WHERE role = 'member';
