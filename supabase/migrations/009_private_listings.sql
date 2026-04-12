-- Add is_private flag to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Update public RLS policy: private listings are hidden from public even when active
DROP POLICY IF EXISTS "public_view_active_listings" ON listings;
CREATE POLICY "public_view_active_listings" ON listings
  FOR SELECT
  USING ((is_active = true AND NOT is_private) OR is_admin());
