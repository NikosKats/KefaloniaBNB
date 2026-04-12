-- Migrate existing 'guest' profiles to 'member' BEFORE changing the constraint
UPDATE profiles SET role = 'member' WHERE role = 'guest';

-- Now safe to apply the tighter constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','super_admin','property_owner','cleaner','member','restaurant_owner'));

-- Add email verification columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email_verification_token UUID DEFAULT gen_random_uuid();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_email_verification_token_idx ON bookings(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_user_id ON bookings(guest_user_id);

-- Mark all existing bookings as verified (backward compat)
UPDATE bookings SET email_verified = true WHERE email_verified = false;

-- Guest magic link table for passwordless login
CREATE TABLE IF NOT EXISTS guest_magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
