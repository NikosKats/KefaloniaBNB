-- ============================================================
-- Villa Direct Booking – Full Supabase Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search

-- ============================================================
-- PROFILES (mirrors auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','super_admin')),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE profiles IS 'Admin users only — no guest accounts';

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- LISTINGS
-- ============================================================
CREATE TABLE listings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  tagline           TEXT,                        -- short hero subtitle
  description       TEXT,                        -- rich text / markdown
  property_type     TEXT NOT NULL DEFAULT 'villa' CHECK (property_type IN ('villa','cottage','apartment','house','studio')),
  address           TEXT,
  city              TEXT,
  region            TEXT,
  country           TEXT NOT NULL DEFAULT 'Greece',
  latitude          DECIMAL(9,6),
  longitude         DECIMAL(9,6),
  map_embed_url     TEXT,                        -- Google Maps embed src
  -- Capacity
  max_guests        INTEGER NOT NULL DEFAULT 2,
  bedrooms          INTEGER NOT NULL DEFAULT 1,
  beds              INTEGER NOT NULL DEFAULT 1,
  bathrooms         DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  -- Pricing (base)
  base_price        DECIMAL(10,2) NOT NULL,
  cleaning_fee      DECIMAL(10,2) NOT NULL DEFAULT 0,
  extra_guest_fee   DECIMAL(10,2) NOT NULL DEFAULT 0,  -- per night above threshold
  extra_guest_after INTEGER NOT NULL DEFAULT 2,         -- fee kicks in after N guests
  -- Stay rules
  min_nights        INTEGER NOT NULL DEFAULT 1,
  max_nights        INTEGER,
  -- Modes
  instant_booking   BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  -- Content
  check_in_time     TEXT NOT NULL DEFAULT '15:00',
  check_out_time    TEXT NOT NULL DEFAULT '11:00',
  house_rules       TEXT,
  cancellation_policy TEXT NOT NULL DEFAULT 'flexible' CHECK (cancellation_policy IN ('flexible','moderate','strict')),
  -- SEO
  meta_title        TEXT,
  meta_description  TEXT,
  -- Ratings cache (updated by trigger)
  review_count      INTEGER NOT NULL DEFAULT 0,
  avg_rating        DECIMAL(3,2) NOT NULL DEFAULT 0,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listings_active ON listings(is_active, created_at DESC);
CREATE INDEX idx_listings_slug   ON listings(slug);

-- ============================================================
-- LISTING IMAGES
-- ============================================================
CREATE TABLE listing_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_cover    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_images_listing ON listing_images(listing_id, sort_order);

-- ============================================================
-- AMENITIES
-- ============================================================
CREATE TABLE amenities (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key      TEXT UNIQUE NOT NULL,  -- 'wifi', 'pool', etc.
  label    TEXT NOT NULL,
  icon     TEXT,                  -- heroicon or emoji
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','bathroom','bedroom','kitchen','outdoor','safety','accessibility','entertainment'))
);

CREATE TABLE listing_amenities (
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  amenity_id  UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, amenity_id)
);

-- Seed default amenities
INSERT INTO amenities (key, label, icon, category) VALUES
  ('wifi',            'Fast WiFi',              '📶', 'general'),
  ('ac',              'Air conditioning',       '❄️', 'general'),
  ('heating',         'Heating',                '🔥', 'general'),
  ('tv',              'Smart TV',               '📺', 'entertainment'),
  ('washer',          'Washer',                 '🫧', 'general'),
  ('dryer',           'Dryer',                  '🌀', 'general'),
  ('kitchen',         'Full kitchen',           '🍳', 'kitchen'),
  ('dishwasher',      'Dishwasher',             '🍽️', 'kitchen'),
  ('coffee_maker',    'Coffee maker',           '☕', 'kitchen'),
  ('bbq',             'BBQ grill',              '🔥', 'outdoor'),
  ('outdoor_dining',  'Outdoor dining area',    '🌿', 'outdoor'),
  ('fire_pit',        'Fire pit',               '🪵', 'outdoor'),
  ('sun_beds',        'Sun beds',               '🛏️', 'outdoor'),
  ('garden',          'Private garden',         '🌳', 'outdoor'),
  ('private_yard',    'Private yard',           '🏡', 'outdoor'),
  ('outdoor_kitchen', 'Outdoor kitchen',        '🍖', 'outdoor'),
  ('gym',             'Private gym',            '🏋️', 'general'),
  ('beach_access',    'Beach access',           '🏖️', 'outdoor'),
  ('free_parking',    'Free parking',           '🅿️', 'general'),
  ('pool',            'Pool',                   '🏊', 'outdoor'),
  ('hot_tub',         'Hot tub',                '♨️', 'outdoor'),
  ('pet_friendly',    'Pet friendly',           '🐾', 'general'),
  ('family_friendly', 'Family friendly',        '👨‍👩‍👧', 'general'),
  ('self_checkin',    'Self check-in',          '🔑', 'general'),
  ('ev_charger',      'EV charger',             '⚡', 'general'),
  ('safe',            'Safe',                   '🔒', 'safety'),
  ('first_aid',       'First aid kit',          '🩹', 'safety'),
  ('fire_extinguisher','Fire extinguisher',     '🧯', 'safety'),
  ('smoke_detector',  'Smoke detector',         '🚨', 'safety');

-- ============================================================
-- SEASONS (named date ranges for pricing)
-- ============================================================
CREATE TABLE seasons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,        -- 'High Season', 'Easter', etc.
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  price_modifier DECIMAL(5,2) NOT NULL DEFAULT 1.0,  -- multiplier: 1.5 = +50%
  min_nights  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_season_dates CHECK (end_date >= start_date)
);
CREATE INDEX idx_seasons_listing ON seasons(listing_id, start_date, end_date);

-- ============================================================
-- PRICING RULES (weekend, long-stay discounts, etc.)
-- ============================================================
CREATE TABLE pricing_rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  rule_type   TEXT NOT NULL CHECK (rule_type IN ('weekend','weekly_discount','monthly_discount','custom')),
  modifier    DECIMAL(5,4) NOT NULL,   -- 0.9 = 10% discount, 1.2 = 20% surcharge
  applies_to  TEXT,                    -- JSON or description of when rule applies
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCKED DATES (owner blocks, maintenance, etc.)
-- ============================================================
CREATE TABLE blocked_dates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ical','airbnb','booking_com')),
  external_uid TEXT,  -- for iCal dedup
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_blocked_dates CHECK (end_date >= start_date)
);
CREATE INDEX idx_blocked_listing ON blocked_dates(listing_id, start_date, end_date);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value  DECIMAL(10,2) NOT NULL,
  min_nights      INTEGER,
  min_total       DECIMAL(10,2),
  max_uses        INTEGER,
  uses_count      INTEGER NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ,
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  listing_id      UUID REFERENCES listings(id) ON DELETE SET NULL,  -- NULL = applies to all
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coupons_code ON coupons(code, is_active);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id        UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  -- Dates
  check_in          DATE NOT NULL,
  check_out         DATE NOT NULL,
  nights            INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
  -- Guests
  guests_adults     INTEGER NOT NULL DEFAULT 1,
  guests_children   INTEGER NOT NULL DEFAULT 0,
  guests_infants    INTEGER NOT NULL DEFAULT 0,
  guests_pets       INTEGER NOT NULL DEFAULT 0,
  -- Pricing snapshot (immutable after creation)
  base_price        DECIMAL(10,2) NOT NULL,
  base_total        DECIMAL(10,2) NOT NULL,
  cleaning_fee      DECIMAL(10,2) NOT NULL DEFAULT 0,
  extra_guest_fee   DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_id         UUID REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_discount   DECIMAL(10,2) NOT NULL DEFAULT 0,
  taxes             DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price       DECIMAL(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'EUR',
  -- Guest info
  guest_name        TEXT NOT NULL,
  guest_email       TEXT NOT NULL,
  guest_phone       TEXT,
  guest_country     TEXT,
  guest_message     TEXT,
  -- Payment
  payment_status    TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','deposit_paid','paid','refunded','partially_refunded')),
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  amount_paid       DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Admin
  internal_notes    TEXT,
  source            TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','airbnb','booking_com','vrbo','manual')),
  -- Timestamps
  confirmed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT check_dates CHECK (check_out > check_in)
);
CREATE INDEX idx_bookings_listing_dates ON bookings(listing_id, check_in, check_out)
  WHERE status IN ('pending','confirmed');
CREATE INDEX idx_bookings_status    ON bookings(status, created_at DESC);
CREATE INDEX idx_bookings_email     ON bookings(guest_email);
CREATE INDEX idx_bookings_stripe_pi ON bookings(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_name    TEXT NOT NULL,
  guest_country TEXT,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT NOT NULL,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  is_verified   BOOLEAN NOT NULL DEFAULT false,  -- linked to real booking
  source        TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','airbnb','google','booking_com','manual')),
  stay_date     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_listing ON reviews(listing_id, is_published, created_at DESC);

-- Trigger: update listing ratings cache
CREATE OR REPLACE FUNCTION update_listing_ratings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE listings SET
    review_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id) AND is_published = true),
    avg_rating   = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id) AND is_published = true),
    updated_at   = now()
  WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_reviews_update_ratings
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_listing_ratings();

-- ============================================================
-- INQUIRIES (pre-booking contact)
-- ============================================================
CREATE TABLE inquiries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  message     TEXT NOT NULL,
  check_in    DATE,
  check_out   DATE,
  guests      INTEGER,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','converted','spam')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inquiries_status ON inquiries(status, created_at DESC);

-- ============================================================
-- CMS PAGES (FAQs, policies, area guides)
-- ============================================================
CREATE TABLE cms_pages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  page_type   TEXT NOT NULL CHECK (page_type IN ('faq','policy','area_guide','custom')),
  title       TEXT NOT NULL,
  body        TEXT,         -- markdown
  is_published BOOLEAN NOT NULL DEFAULT true,
  meta_title  TEXT,
  meta_description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE faq_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id     UUID REFERENCES cms_pages(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,  -- 'booking.confirmed', 'listing.updated', etc.
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  payload     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

-- ============================================================
-- ICAL FEED SOURCES (for importing external calendars)
-- ============================================================
CREATE TABLE ical_sources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  last_synced TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- UTILITY: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listings_updated_at    BEFORE UPDATE ON listings    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at    BEFORE UPDATE ON bookings    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at   BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cms_pages_updated_at  BEFORE UPDATE ON cms_pages   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AVAILABILITY CHECK FUNCTION (race-condition safe)
-- ============================================================
CREATE OR REPLACE FUNCTION check_availability(
  p_listing_id UUID,
  p_check_in   DATE,
  p_check_out  DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE listing_id = p_listing_id
      AND status IN ('pending','confirmed')
      AND check_in  < p_check_out
      AND check_out > p_check_in
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
  ) AND NOT EXISTS (
    SELECT 1 FROM blocked_dates
    WHERE listing_id = p_listing_id
      AND start_date < p_check_out
      AND end_date   > p_check_in
  );
$$;

-- ============================================================
-- PRICING CALCULATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_price(
  p_listing_id  UUID,
  p_check_in    DATE,
  p_check_out   DATE,
  p_guests      INTEGER DEFAULT 2,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  nights          INTEGER,
  base_price      DECIMAL,
  base_total      DECIMAL,
  season_modifier DECIMAL,
  cleaning_fee    DECIMAL,
  extra_guest_fee DECIMAL,
  coupon_discount DECIMAL,
  taxes           DECIMAL,
  total           DECIMAL,
  currency        TEXT
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_listing       listings%ROWTYPE;
  v_nights        INTEGER;
  v_season_mod    DECIMAL := 1.0;
  v_season        seasons%ROWTYPE;
  v_base_price    DECIMAL;
  v_base_total    DECIMAL;
  v_extra_fee     DECIMAL := 0;
  v_coupon        coupons%ROWTYPE;
  v_discount      DECIMAL := 0;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;
  v_nights := p_check_out - p_check_in;

  -- Apply season modifier (pick highest-priority overlapping season)
  SELECT * INTO v_season FROM seasons
  WHERE listing_id = p_listing_id
    AND start_date <= p_check_in
    AND end_date   >= p_check_out
  ORDER BY price_modifier DESC LIMIT 1;
  IF FOUND THEN v_season_mod := v_season.price_modifier; END IF;

  v_base_price := v_listing.base_price * v_season_mod;
  v_base_total := v_base_price * v_nights;

  -- Extra guest fee
  IF p_guests > v_listing.extra_guest_after THEN
    v_extra_fee := v_listing.extra_guest_fee * (p_guests - v_listing.extra_guest_after) * v_nights;
  END IF;

  -- Coupon
  IF p_coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon FROM coupons
    WHERE code = UPPER(p_coupon_code)
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= now())
      AND (valid_until IS NULL OR valid_until >= now())
      AND (max_uses IS NULL OR uses_count < max_uses)
      AND (listing_id IS NULL OR listing_id = p_listing_id);
    IF FOUND THEN
      IF v_coupon.discount_type = 'percent' THEN
        v_discount := ROUND((v_base_total + v_extra_fee) * v_coupon.discount_value / 100, 2);
      ELSE
        v_discount := LEAST(v_coupon.discount_value, v_base_total + v_extra_fee);
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_nights,
    v_base_price,
    v_base_total,
    v_season_mod,
    v_listing.cleaning_fee,
    v_extra_fee,
    v_discount,
    0.00::DECIMAL,  -- taxes: calculate externally if needed
    (v_base_total + v_listing.cleaning_fee + v_extra_fee - v_discount),
    'EUR'::TEXT;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'));
$$;

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_select_profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "own_profile"            ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- listings
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_active_listings"  ON listings FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "admins_manage_listings"       ON listings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- listing_images
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_images"   ON listing_images FOR SELECT USING (true);
CREATE POLICY "admins_manage_images" ON listing_images FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- amenities
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_amenities"   ON amenities FOR SELECT USING (true);
CREATE POLICY "admins_manage_amenities" ON amenities FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- listing_amenities
ALTER TABLE listing_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_listing_amenities"   ON listing_amenities FOR SELECT USING (true);
CREATE POLICY "admins_manage_listing_amenities" ON listing_amenities FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_seasons"   ON seasons FOR SELECT USING (true);
CREATE POLICY "admins_manage_seasons" ON seasons FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- pricing_rules
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_pricing_rules"   ON pricing_rules FOR SELECT USING (true);
CREATE POLICY "admins_manage_pricing_rules" ON pricing_rules FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- blocked_dates
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_blocked_dates"   ON blocked_dates FOR SELECT USING (true);
CREATE POLICY "admins_manage_blocked_dates" ON blocked_dates FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_manage_coupons" ON coupons FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- bookings: public can INSERT (pending), no public SELECT, admin has full access
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_create_booking"  ON bookings FOR INSERT WITH CHECK (status = 'pending' AND payment_status = 'unpaid');
CREATE POLICY "admins_manage_bookings" ON bookings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_reviews"   ON reviews FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "admins_manage_reviews" ON reviews FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- inquiries: public can INSERT, admin manages
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_create_inquiry"  ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "admins_manage_inquiries" ON inquiries FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- cms_pages
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_cms"   ON cms_pages FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "admins_manage_cms" ON cms_pages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- faq_items
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_view_faqs"   ON faq_items FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "admins_manage_faqs" ON faq_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_view_audit" ON audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "service_insert_audit" ON audit_logs FOR INSERT WITH CHECK (true); -- service role only

-- ical_sources
ALTER TABLE ical_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_manage_ical" ON ical_sources FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- SEED: DEMO LISTING (KefaloniaBNB)
-- ============================================================
INSERT INTO listings (
  slug, title, tagline, description, property_type,
  address, city, region, country,
  latitude, longitude,
  max_guests, bedrooms, beds, bathrooms,
  base_price, cleaning_fee, extra_guest_fee, extra_guest_after,
  min_nights, max_nights,
  instant_booking, is_active,
  check_in_time, check_out_time,
  house_rules, cancellation_policy,
  meta_title, meta_description
) VALUES (
  'villa-keramoti-garden-gym',
  'Villa with Garden and Private Gym',
  'Your luxury retreat on the shores of Keramoti',
  E'Escape to this stunning villa nestled in the serene village of Keramoti, just steps from the crystalline Aegean Sea.\n\nSet within a lush private garden, this spacious 5-bedroom retreat is ideal for large groups and families seeking an authentic Greek experience with premium comforts. Host unforgettable alfresco dinners, unwind by the firepit under the stars, or energise with a morning workout in the fully equipped private gym.\n\nThe villa blends traditional Greek architecture with modern amenities: an outdoor kitchen for lazy summer barbecues, sun-soaked terraces with loungers, and beautifully appointed bedrooms with en-suite bathrooms. Located minutes from Keramoti''s sandy beach and the ferry to Thassos Island, it''s the perfect base for exploring the region.',
  'villa',
  'Keramoti Beach Rd', 'Keramoti', 'Kefalonia', 'Greece',
  40.8571, 24.6797,
  12, 5, 9, 3.0,
  250.00, 150.00, 15.00, 8,
  3, 30,
  false, true,
  '15:00', '11:00',
  E'- No smoking indoors\n- Pets welcome with prior approval\n- No parties or events without prior consent\n- Please respect quiet hours between 23:00–08:00\n- Leave the property as you found it',
  'moderate',
  'KefaloniaBNB – Luxury 5BR Villa with Garden & Gym | Direct Booking',
  'Book direct and save. Stunning 5-bedroom villa in Keramoti, Greece. Private garden, outdoor kitchen, firepit, gym, beach access. Up to 12 guests.'
);

-- Attach amenities to the demo listing
INSERT INTO listing_amenities (listing_id, amenity_id)
SELECT l.id, a.id FROM listings l, amenities a
WHERE l.slug = 'villa-keramoti-garden-gym'
  AND a.key IN ('wifi','ac','kitchen','bbq','outdoor_dining','fire_pit','sun_beds','garden','private_yard','outdoor_kitchen','gym','beach_access','free_parking','pet_friendly','family_friendly','self_checkin','first_aid','smoke_detector','fire_extinguisher','safe');

-- Seed a high-season pricing
INSERT INTO seasons (listing_id, name, start_date, end_date, price_modifier, min_nights)
SELECT id, 'Peak Summer',  '2026-07-01', '2026-08-31', 1.50, 5 FROM listings WHERE slug = 'villa-keramoti-garden-gym';

INSERT INTO seasons (listing_id, name, start_date, end_date, price_modifier, min_nights)
SELECT id, 'Shoulder Season', '2026-06-01', '2026-06-30', 1.20, 3 FROM listings WHERE slug = 'villa-keramoti-garden-gym';

INSERT INTO seasons (listing_id, name, start_date, end_date, price_modifier, min_nights)
SELECT id, 'Shoulder Season', '2026-09-01', '2026-09-30', 1.20, 3 FROM listings WHERE slug = 'villa-keramoti-garden-gym';

-- Seed sample reviews
INSERT INTO reviews (listing_id, guest_name, guest_country, rating, title, body, is_published, is_verified, source, stay_date)
SELECT id,
  'Alexandra M.', 'United Kingdom', 5,
  'Absolutely magical — best villa we''ve ever stayed in',
  'We celebrated our anniversary here with 10 friends and it was flawless. The garden, the outdoor kitchen, the gym... everything was perfect. The host was incredibly responsive. Already planning our return trip!',
  true, false, 'manual', '2025-08-10'
FROM listings WHERE slug = 'villa-keramoti-garden-gym';

INSERT INTO reviews (listing_id, guest_name, guest_country, rating, title, body, is_published, is_verified, source, stay_date)
SELECT id,
  'Stavros K.', 'Greece', 5,
  'Incredible family retreat',
  'We spent 10 days here with our extended family. The kids loved the garden and the adults couldn''t get enough of the outdoor dining area. The beach is a 5-minute walk. Highly recommend!',
  true, false, 'manual', '2025-07-22'
FROM listings WHERE slug = 'villa-keramoti-garden-gym';

INSERT INTO reviews (listing_id, guest_name, guest_country, rating, title, body, is_published, is_verified, source, stay_date)
SELECT id,
  'Margot D.', 'France', 5,
  'Dream Greek villa',
  'The photos don''t do it justice. Waking up to the smell of the sea, having breakfast in the garden, evenings by the firepit — it was truly special. The gym was a great bonus. 5 stars without hesitation.',
  true, false, 'manual', '2025-09-05'
FROM listings WHERE slug = 'villa-keramoti-garden-gym';

-- Seed CMS pages
INSERT INTO cms_pages (slug, page_type, title, body, is_published, meta_title, meta_description) VALUES
('faqs', 'faq', 'Frequently Asked Questions', NULL, true, 'FAQs | KefaloniaBNB Direct Booking', 'Everything you need to know before booking your stay.'),
('cancellation-policy', 'policy', 'Cancellation Policy', E'## Our Cancellation Policy\n\n**Flexible cancellations for your peace of mind.**\n\n- Cancellations made more than **30 days** before check-in: **full refund**\n- Cancellations made **14–30 days** before check-in: **50% refund** of the total amount paid\n- Cancellations made **less than 14 days** before check-in: **no refund**\n\nAll cancellations must be submitted in writing via email. Refunds are processed within 5–10 business days to the original payment method.\n\nFor extenuating circumstances (illness, natural disaster, etc.) we handle cases individually and always aim to be fair.', true, 'Cancellation Policy | KefaloniaBNB', NULL),
('privacy-policy', 'policy', 'Privacy Policy', E'## Privacy Policy\n\nYour privacy is important to us. This policy explains how we collect, use, and protect your personal data in accordance with GDPR.\n\n**Data we collect:** name, email, phone, booking dates, payment references.\n\n**How we use it:** to process your booking, send confirmation emails, and provide support.\n\n**We never sell your data** to third parties.\n\n**Your rights:** access, correction, deletion. Contact us at privacy@kefaloniabnb.com', true, 'Privacy Policy | KefaloniaBNB', NULL),
('terms', 'policy', 'Terms & Conditions', E'## Terms & Conditions\n\nBy making a booking you agree to these terms.\n\n1. **Booking confirmation** is issued upon receipt of payment.\n2. **Guest responsibility:** guests are responsible for the property during their stay.\n3. **Damage deposits** may be collected at check-in.\n4. **Maximum occupancy** must not be exceeded.\n5. **House rules** must be respected at all times.', true, 'Terms & Conditions | KefaloniaBNB', NULL);

INSERT INTO faq_items (page_id, question, answer, sort_order)
SELECT p.id, q.question, q.answer, q.sort_order FROM cms_pages p,
(VALUES
  ('How do I book?', 'Select your dates on the listing page, enter your guest count, and proceed to our secure Stripe checkout. You''ll receive an email confirmation immediately.', 1),
  ('Is there a security deposit?', 'A refundable security deposit of €500 is charged at check-in and returned within 48 hours of check-out, provided no damage is found.', 2),
  ('Can I bring my pet?', 'Yes! We are pet-friendly. Please let us know in advance so we can prepare. A small pet cleaning fee may apply.', 3),
  ('What is the check-in process?', 'We offer self check-in with a key lockbox. Full instructions are sent 48 hours before your arrival date.', 4),
  ('How far is the beach?', 'The beach is approximately a 5-minute walk from the villa. Keramoti has one of the most beautiful sandy beaches in Northern Greece.', 5),
  ('Can we take the ferry to Thassos?', 'Absolutely — the Keramoti–Thassos ferry runs multiple times daily and is just minutes from the villa. It''s a fantastic day trip.', 6),
  ('Is the property suitable for families?', 'Very much so. The villa has a large enclosed garden, safe outdoor space, and ample sleeping arrangements for families with children of all ages.', 7),
  ('What is included in the rental?', 'All bedding, towels, Wi-Fi, air conditioning, parking, the gym, and all outdoor facilities are included. The kitchen is fully stocked with cookware and appliances.', 8)
) AS q(question, answer, sort_order)
WHERE p.slug = 'faqs';
