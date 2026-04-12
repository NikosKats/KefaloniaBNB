-- ============================================================================
-- 049: Community Features — Reports, Technicians, Restaurants
-- ============================================================================

-- ── Problem Reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'road_damage', 'water_supply', 'electricity', 'waste',
    'street_lighting', 'stray_animals', 'noise', 'flooding', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  location TEXT,                  -- e.g. "Near the port, Keramoti"
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  reporter_name TEXT,
  reporter_email TEXT,
  reporter_phone TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports (category);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports (created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_public_read ON reports;
CREATE POLICY reports_public_read ON reports FOR SELECT TO anon USING (status IN ('open', 'in_progress', 'resolved'));
DROP POLICY IF EXISTS reports_auth_read ON reports;
CREATE POLICY reports_auth_read ON reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reports_anon_insert ON reports;
CREATE POLICY reports_anon_insert ON reports FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS reports_auth_insert ON reports;
CREATE POLICY reports_auth_insert ON reports FOR INSERT TO authenticated WITH CHECK (true);

-- ── Technician Categories ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS technician_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_el TEXT NOT NULL,
  icon TEXT,               -- emoji or icon class
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE technician_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tc_public_read ON technician_categories;
CREATE POLICY tc_public_read ON technician_categories FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS tc_auth_read ON technician_categories;
CREATE POLICY tc_auth_read ON technician_categories FOR SELECT TO authenticated USING (true);

-- Seed default categories
INSERT INTO technician_categories (slug, name_en, name_el, icon, sort_order) VALUES
  ('plumber',       'Plumber',        'Υδραυλικός',       '🔧', 1),
  ('electrician',   'Electrician',    'Ηλεκτρολόγος',     '⚡', 2),
  ('ac-technician', 'AC Technician',  'Τεχνικός Κλιματισμού', '❄️', 3),
  ('locksmith',     'Locksmith',      'Κλειδαράς',        '🔑', 4),
  ('painter',       'Painter',        'Ελαιοχρωματιστής', '🎨', 5),
  ('carpenter',     'Carpenter',      'Ξυλουργός',        '🪚', 6),
  ('gardener',      'Gardener',       'Κηπουρός',         '🌿', 7),
  ('pest-control',  'Pest Control',   'Απεντόμωση',       '🐛', 8),
  ('general',       'General Handyman','Γενικός Τεχνίτης', '🛠️', 9)
ON CONFLICT (slug) DO NOTHING;

-- ── Technicians ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,
  bio TEXT,
  category_id UUID NOT NULL REFERENCES technician_categories(id) ON DELETE CASCADE,
  service_areas TEXT[] DEFAULT '{}'::TEXT[],  -- e.g. ['Keramoti', 'Kefalonia', 'Nea Peramos']
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technicians_category ON technicians (category_id);
CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians (is_active) WHERE is_active = true;

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tech_public_read ON technicians;
CREATE POLICY tech_public_read ON technicians FOR SELECT TO anon USING (is_active = true);
DROP POLICY IF EXISTS tech_auth_read ON technicians;
CREATE POLICY tech_auth_read ON technicians FOR SELECT TO authenticated USING (true);

-- ── Restaurants ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  description_el TEXT,
  cuisine_type TEXT[] DEFAULT '{}'::TEXT[],  -- e.g. ['seafood', 'greek', 'taverna']
  address TEXT,
  city TEXT NOT NULL DEFAULT 'Keramoti',
  phone TEXT,
  website TEXT,
  google_maps_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_urls TEXT[] DEFAULT '{}'::TEXT[],
  cover_photo TEXT,
  price_range TEXT CHECK (price_range IN ('budget', 'moderate', 'upscale')),
  features TEXT[] DEFAULT '{}'::TEXT[],     -- e.g. ['sea_view', 'outdoor_seating', 'delivery']
  opening_hours JSONB,                      -- e.g. {"mon": "12:00-23:00", "tue": "12:00-23:00", ...}
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants (city);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rest_public_read ON restaurants;
CREATE POLICY rest_public_read ON restaurants FOR SELECT TO anon USING (is_active = true);
DROP POLICY IF EXISTS rest_auth_read ON restaurants;
CREATE POLICY rest_auth_read ON restaurants FOR SELECT TO authenticated USING (true);
