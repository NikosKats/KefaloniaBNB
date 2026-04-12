-- ============================================================================
-- 056: Fix profile trigger to support community member signups
-- ============================================================================

-- Change default role from 'admin' to 'member' (safer default)
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'member';

-- Update trigger to read role from user metadata, default to 'member'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$;
