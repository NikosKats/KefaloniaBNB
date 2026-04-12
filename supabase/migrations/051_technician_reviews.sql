-- ============================================================================
-- 051: Technician Reviews
-- ============================================================================

CREATE TABLE IF NOT EXISTS technician_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tech_reviews_tech ON technician_reviews (technician_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_tech_reviews_pending ON technician_reviews (is_approved, created_at DESC);

ALTER TABLE technician_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews
DROP POLICY IF EXISTS tech_reviews_public_read ON technician_reviews;
CREATE POLICY tech_reviews_public_read ON technician_reviews
  FOR SELECT TO anon USING (is_approved = true);
DROP POLICY IF EXISTS tech_reviews_auth_read ON technician_reviews;
CREATE POLICY tech_reviews_auth_read ON technician_reviews
  FOR SELECT TO authenticated USING (true);
-- Anyone can submit
DROP POLICY IF EXISTS tech_reviews_anon_insert ON technician_reviews;
CREATE POLICY tech_reviews_anon_insert ON technician_reviews
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS tech_reviews_auth_insert ON technician_reviews;
CREATE POLICY tech_reviews_auth_insert ON technician_reviews
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger: recalculate avg_rating and review_count on technicians
CREATE OR REPLACE FUNCTION update_technician_rating() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  tid UUID;
BEGIN
  tid := COALESCE(NEW.technician_id, OLD.technician_id);
  UPDATE technicians SET
    avg_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM technician_reviews
      WHERE technician_id = tid AND is_approved = true
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM technician_reviews
      WHERE technician_id = tid AND is_approved = true
    )
  WHERE id = tid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tech_review_rating ON technician_reviews;
CREATE TRIGGER trg_tech_review_rating
  AFTER INSERT OR UPDATE OR DELETE ON technician_reviews
  FOR EACH ROW EXECUTE FUNCTION update_technician_rating();
