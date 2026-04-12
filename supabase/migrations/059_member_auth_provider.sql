-- ============================================================================
-- 059: Track auth provider on profiles (email, google, facebook)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
