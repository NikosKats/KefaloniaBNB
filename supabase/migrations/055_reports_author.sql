-- ============================================================================
-- 055: Link reports to registered community members
-- ============================================================================

ALTER TABLE reports ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reports_author ON reports (author_id) WHERE author_id IS NOT NULL;
