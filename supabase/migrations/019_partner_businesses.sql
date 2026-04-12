-- ============================================================
-- Partner Businesses — local tavernas, boat rentals, activities, etc.
-- ============================================================

-- Raw interest submissions from the guide page form
CREATE TABLE partner_interests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name  TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  email         TEXT NOT NULL,
  message       TEXT,
  location_slug TEXT NOT NULL,
  location_name TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'approved', 'rejected')),
  notes         TEXT,           -- admin internal notes
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_interests_status ON partner_interests(status);
CREATE INDEX idx_partner_interests_location ON partner_interests(location_slug);

-- Approved / featured businesses shown in local guides
CREATE TABLE partner_businesses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id    UUID REFERENCES partner_interests(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL
                 CHECK (type IN ('taverna','restaurant','cafe','bar','boat_rental','guided_tour','watersports','transport','shop','other')),
  location_slug  TEXT NOT NULL,
  location_name  TEXT NOT NULL,
  description    TEXT NOT NULL,
  highlight      TEXT,          -- short one-liner shown on cards, e.g. "Best fresh fish in Keramoti"
  address        TEXT,
  phone          TEXT,
  website        TEXT,
  google_maps_url TEXT,
  price_range    TEXT CHECK (price_range IN ('€','€€','€€€')),
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','inactive')),
  featured       BOOLEAN NOT NULL DEFAULT false,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_businesses_location ON partner_businesses(location_slug, status);
CREATE INDEX idx_partner_businesses_featured ON partner_businesses(featured, status);
