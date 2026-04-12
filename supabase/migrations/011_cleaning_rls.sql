-- ============================================================
-- 011_cleaning_rls.sql  —  Row Level Security for cleaning tables
-- ============================================================

ALTER TABLE cleaner_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_service_areas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_availability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklist_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_payouts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_disputes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_notifications  ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin() already defined in earlier migrations
-- Helper: current user's cleaner profile id
CREATE OR REPLACE FUNCTION my_cleaner_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM cleaner_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── cleaner_profiles ────────────────────────────────────────
CREATE POLICY "cleaner_profiles_select" ON cleaner_profiles
  FOR SELECT USING (is_active OR is_admin() OR user_id = auth.uid());

CREATE POLICY "cleaner_profiles_insert" ON cleaner_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "cleaner_profiles_update" ON cleaner_profiles
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- ── cleaner_service_areas ────────────────────────────────────
CREATE POLICY "service_areas_select" ON cleaner_service_areas
  FOR SELECT USING (true);

CREATE POLICY "service_areas_write" ON cleaner_service_areas
  FOR ALL USING (
    cleaner_id = my_cleaner_id() OR is_admin()
  );

-- ── cleaner_services ────────────────────────────────────────
CREATE POLICY "cleaner_services_select" ON cleaner_services
  FOR SELECT USING (true);

CREATE POLICY "cleaner_services_write" ON cleaner_services
  FOR ALL USING (
    cleaner_id = my_cleaner_id() OR is_admin()
  );

-- ── cleaner_availability ────────────────────────────────────
CREATE POLICY "cleaner_avail_select" ON cleaner_availability
  FOR SELECT USING (true);

CREATE POLICY "cleaner_avail_write" ON cleaner_availability
  FOR ALL USING (
    cleaner_id = my_cleaner_id() OR is_admin()
  );

-- ── cleaning_requests ────────────────────────────────────────
CREATE POLICY "requests_owner_select" ON cleaning_requests
  FOR SELECT USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "requests_cleaner_select" ON cleaning_requests
  FOR SELECT USING (status = 'open');

CREATE POLICY "requests_owner_insert" ON cleaning_requests
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "requests_owner_update" ON cleaning_requests
  FOR UPDATE USING (owner_id = auth.uid() OR is_admin());

-- ── cleaning_matches ────────────────────────────────────────
CREATE POLICY "matches_cleaner_select" ON cleaning_matches
  FOR SELECT USING (
    cleaner_id = my_cleaner_id()
    OR EXISTS (SELECT 1 FROM cleaning_requests r WHERE r.id = request_id AND r.owner_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "matches_cleaner_insert" ON cleaning_matches
  FOR INSERT WITH CHECK (cleaner_id = my_cleaner_id());

CREATE POLICY "matches_owner_update" ON cleaning_matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM cleaning_requests r WHERE r.id = request_id AND r.owner_id = auth.uid())
    OR is_admin()
  );

-- ── cleaning_jobs ────────────────────────────────────────────
CREATE POLICY "jobs_parties_select" ON cleaning_jobs
  FOR SELECT USING (
    owner_id = auth.uid()
    OR cleaner_id = my_cleaner_id()
    OR is_admin()
  );

CREATE POLICY "jobs_admin_write" ON cleaning_jobs
  FOR ALL USING (is_admin());

CREATE POLICY "jobs_cleaner_update" ON cleaning_jobs
  FOR UPDATE USING (cleaner_id = my_cleaner_id());

-- ── job_checklist_items ──────────────────────────────────────
CREATE POLICY "checklist_select" ON job_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cleaning_jobs j
      WHERE j.id = job_id
        AND (j.owner_id = auth.uid() OR j.cleaner_id = my_cleaner_id() OR is_admin())
    )
  );

CREATE POLICY "checklist_write" ON job_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cleaning_jobs j
      WHERE j.id = job_id
        AND (j.cleaner_id = my_cleaner_id() OR is_admin())
    )
  );

-- ── job_photos ───────────────────────────────────────────────
CREATE POLICY "photos_select" ON job_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cleaning_jobs j
      WHERE j.id = job_id
        AND (j.owner_id = auth.uid() OR j.cleaner_id = my_cleaner_id() OR is_admin())
    )
  );

CREATE POLICY "photos_write" ON job_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cleaning_jobs j
      WHERE j.id = job_id AND j.cleaner_id = my_cleaner_id()
    )
  );

-- ── cleaning_payments ────────────────────────────────────────
CREATE POLICY "payments_parties_select" ON cleaning_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cleaning_jobs j
      WHERE j.id = job_id
        AND (j.owner_id = auth.uid() OR j.cleaner_id = my_cleaner_id() OR is_admin())
    )
  );

-- ── cleaning_payouts ────────────────────────────────────────
CREATE POLICY "payouts_cleaner_select" ON cleaning_payouts
  FOR SELECT USING (
    cleaner_id = my_cleaner_id() OR is_admin()
  );

-- ── cleaning_reviews ────────────────────────────────────────
CREATE POLICY "reviews_select" ON cleaning_reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert" ON cleaning_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- ── cleaning_disputes ────────────────────────────────────────
CREATE POLICY "disputes_select" ON cleaning_disputes
  FOR SELECT USING (
    raised_by = auth.uid()
    OR EXISTS (SELECT 1 FROM cleaning_jobs j WHERE j.id = job_id AND j.cleaner_id = my_cleaner_id())
    OR is_admin()
  );

CREATE POLICY "disputes_insert" ON cleaning_disputes
  FOR INSERT WITH CHECK (raised_by = auth.uid());

CREATE POLICY "disputes_admin_update" ON cleaning_disputes
  FOR UPDATE USING (is_admin());

-- ── cleaning_notifications ───────────────────────────────────
CREATE POLICY "notifs_select" ON cleaning_notifications
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifs_update" ON cleaning_notifications
  FOR UPDATE USING (user_id = auth.uid());
