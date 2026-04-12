-- ============================================================
-- 012_cleaner_role.sql  —  Add 'cleaner' to profiles role constraint
-- ============================================================

-- Drop and recreate the CHECK constraint to add 'cleaner' role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'super_admin', 'property_owner', 'cleaner'));

-- Cleaners can read their own profile
DROP POLICY IF EXISTS "profiles_cleaner_select" ON profiles;
CREATE POLICY "profiles_cleaner_select" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

-- Cleaners can update their own profile
DROP POLICY IF EXISTS "profiles_cleaner_update" ON profiles;
CREATE POLICY "profiles_cleaner_update" ON profiles
  FOR UPDATE USING (id = auth.uid());
