-- ============================================================
-- 010_cleaning_marketplace.sql  —  Cleaning Marketplace schema
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
CREATE TYPE cleaning_request_status AS ENUM (
  'open', 'matched', 'confirmed', 'cancelled'
);
CREATE TYPE cleaning_job_status AS ENUM (
  'scheduled', 'started', 'completed', 'approved', 'disputed', 'cancelled'
);
CREATE TYPE cleaning_payment_status AS ENUM (
  'pending', 'paid', 'refunded'
);
CREATE TYPE cleaning_payout_status AS ENUM (
  'pending', 'transferred', 'failed'
);
CREATE TYPE cleaning_dispute_status AS ENUM (
  'open', 'resolved', 'escalated'
);

-- ── Cleaner profiles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleaner_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio              TEXT,
  languages        TEXT[] DEFAULT '{}',
  stripe_account_id TEXT,
  stripe_onboarded  BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  rating            NUMERIC(3,2),
  review_count      INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS cleaner_service_areas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id  UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE CASCADE,
  region      TEXT NOT NULL,
  city        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaner_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id      UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE CASCADE,
  property_type   TEXT NOT NULL,
  bedrooms_min    INT NOT NULL DEFAULT 0,
  bedrooms_max    INT NOT NULL DEFAULT 10,
  base_price      NUMERIC(10,2) NOT NULL,
  duration_hours  NUMERIC(4,2) NOT NULL DEFAULT 3,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaner_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id  UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cleaner_id, date)
);

-- ── Cleaning requests (from property owners) ─────────────────
CREATE TABLE IF NOT EXISTS cleaning_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  owner_id        UUID NOT NULL REFERENCES auth.users(id),
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  requested_date  DATE NOT NULL,
  earliest_time   TIME NOT NULL DEFAULT '10:00',
  latest_time     TIME NOT NULL DEFAULT '16:00',
  notes           TEXT,
  status          cleaning_request_status NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Matches (cleaner bids / assignments) ─────────────────────
CREATE TABLE IF NOT EXISTS cleaning_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES cleaning_requests(id) ON DELETE CASCADE,
  cleaner_id      UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE CASCADE,
  proposed_price  NUMERIC(10,2) NOT NULL,
  proposed_time   TIME,
  message         TEXT,
  is_accepted     BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, cleaner_id)
);

-- ── Jobs (confirmed cleaning engagements) ────────────────────
CREATE TABLE IF NOT EXISTS cleaning_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES cleaning_matches(id) ON DELETE RESTRICT,
  request_id      UUID NOT NULL REFERENCES cleaning_requests(id) ON DELETE RESTRICT,
  cleaner_id      UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE RESTRICT,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  owner_id        UUID NOT NULL REFERENCES auth.users(id),
  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME NOT NULL,
  agreed_price    NUMERIC(10,2) NOT NULL,
  platform_fee    NUMERIC(10,2) NOT NULL DEFAULT 0,
  cleaner_payout  NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          cleaning_job_status NOT NULL DEFAULT 'scheduled',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  internal_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_fee CHECK (platform_fee + cleaner_payout = agreed_price),
  CONSTRAINT positive_price CHECK (agreed_price > 0)
);

CREATE TABLE IF NOT EXISTS job_checklist_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id    UUID NOT NULL REFERENCES cleaning_jobs(id) ON DELETE CASCADE,
  label     TEXT NOT NULL,
  is_done   BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID NOT NULL REFERENCES cleaning_jobs(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  phase      TEXT NOT NULL CHECK (phase IN ('before','after')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Payments & payouts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleaning_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL REFERENCES cleaning_jobs(id) ON DELETE RESTRICT,
  stripe_payment_intent TEXT,
  stripe_checkout_session TEXT,
  amount                NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'eur',
  status                cleaning_payment_status NOT NULL DEFAULT 'pending',
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaning_payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID NOT NULL REFERENCES cleaning_jobs(id) ON DELETE RESTRICT,
  cleaner_id          UUID NOT NULL REFERENCES cleaner_profiles(id) ON DELETE RESTRICT,
  stripe_transfer_id  TEXT,
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'eur',
  status              cleaning_payout_status NOT NULL DEFAULT 'pending',
  transferred_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Reviews ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleaning_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES cleaning_jobs(id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES auth.users(id),
  cleaner_id   UUID NOT NULL REFERENCES cleaner_profiles(id),
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, reviewer_id)
);

-- ── Disputes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleaning_disputes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES cleaning_jobs(id) ON DELETE RESTRICT,
  raised_by    UUID NOT NULL REFERENCES auth.users(id),
  reason       TEXT NOT NULL,
  status       cleaning_dispute_status NOT NULL DEFAULT 'open',
  resolution   TEXT,
  resolved_by  UUID REFERENCES auth.users(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleaning_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── updated_at triggers ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cleaner_profiles','cleaner_services','cleaning_requests',
    'cleaning_matches','cleaning_jobs','cleaning_payments',
    'cleaning_payouts','cleaning_disputes'
  ] LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cleaning_requests_listing  ON cleaning_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_requests_owner    ON cleaning_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_requests_date     ON cleaning_requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_cleaner      ON cleaning_jobs(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_listing      ON cleaning_jobs(listing_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_jobs_date         ON cleaning_jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_notifications_user ON cleaning_notifications(user_id, is_read);
