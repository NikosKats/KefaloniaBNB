-- ============================================================================
-- 057: Restaurant Online Reservations
-- ============================================================================

-- ── 1. Extend profiles role constraint ──────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'super_admin', 'property_owner', 'cleaner', 'member', 'restaurant_owner'));

-- ── 2. Extend restaurants table ─────────────────────────────────────────────
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS accepts_reservations BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reservation_slot_minutes INT NOT NULL DEFAULT 30;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reservation_max_advance_days INT NOT NULL DEFAULT 30;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reservation_min_hours_ahead INT NOT NULL DEFAULT 2;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS opening_hours_reservation JSONB;

CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants (owner_id) WHERE owner_id IS NOT NULL;

-- ── 3. Restaurant tables ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 2,
  location TEXT DEFAULT 'indoor',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant ON restaurant_tables (restaurant_id);

ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Anon can read active tables (for capacity display on public page)
DROP POLICY IF EXISTS rt_public_read ON restaurant_tables;
CREATE POLICY rt_public_read ON restaurant_tables
  FOR SELECT TO anon USING (is_active = true);
DROP POLICY IF EXISTS rt_auth_read ON restaurant_tables;
CREATE POLICY rt_auth_read ON restaurant_tables
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rt_auth_insert ON restaurant_tables;
CREATE POLICY rt_auth_insert ON restaurant_tables
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
DROP POLICY IF EXISTS rt_auth_update ON restaurant_tables;
CREATE POLICY rt_auth_update ON restaurant_tables
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
DROP POLICY IF EXISTS rt_auth_delete ON restaurant_tables;
CREATE POLICY rt_auth_delete ON restaurant_tables
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- ── 4. Restaurant reservations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_count INT NOT NULL DEFAULT 2,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 120,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  notes TEXT,
  special_requests TEXT,
  telegram_message_id INT,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rr_restaurant_date ON restaurant_reservations (restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_rr_status ON restaurant_reservations (status);
CREATE INDEX IF NOT EXISTS idx_rr_date_time ON restaurant_reservations (date, time_slot);

ALTER TABLE restaurant_reservations ENABLE ROW LEVEL SECURITY;

-- Anyone can create a reservation (public form)
DROP POLICY IF EXISTS rr_anon_insert ON restaurant_reservations;
CREATE POLICY rr_anon_insert ON restaurant_reservations
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS rr_auth_insert ON restaurant_reservations;
CREATE POLICY rr_auth_insert ON restaurant_reservations
  FOR INSERT TO authenticated WITH CHECK (true);

-- Owners and admins can read/update reservations for their restaurants
DROP POLICY IF EXISTS rr_auth_read ON restaurant_reservations;
CREATE POLICY rr_auth_read ON restaurant_reservations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
DROP POLICY IF EXISTS rr_auth_update ON restaurant_reservations;
CREATE POLICY rr_auth_update ON restaurant_reservations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
-- Anon read for status lookup (by reservation ID)
DROP POLICY IF EXISTS rr_anon_read ON restaurant_reservations;
CREATE POLICY rr_anon_read ON restaurant_reservations
  FOR SELECT TO anon USING (true);
