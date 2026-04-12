-- ============================================================================
-- 063: Link restaurant reservations to member accounts
-- ============================================================================

ALTER TABLE restaurant_reservations
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_member ON restaurant_reservations (member_id, date DESC);
