-- ============================================================
-- Migration 003: Add Kefalonia City Apartment listing
-- ============================================================

-- 1. Update brand references in existing seed data
UPDATE listings
  SET
    meta_title       = 'Villa with Garden and Private Gym | KefaloniaBNB',
    meta_description = 'Book the 5-bedroom villa in Keramoti directly with KefaloniaBNB. Private garden, gym, beach access. Up to 12 guests. Best rate guaranteed.'
  WHERE slug = 'villa-keramoti-garden-gym';

-- 2. Insert the Kefalonia apartment listing
INSERT INTO listings (
  slug,
  title,
  tagline,
  description,
  property_type,
  address,
  city,
  region,
  country,
  max_guests,
  bedrooms,
  beds,
  bathrooms,
  base_price,
  cleaning_fee,
  extra_guest_fee,
  extra_guest_after,
  min_nights,
  max_nights,
  instant_booking,
  is_active,
  check_in_time,
  check_out_time,
  house_rules,
  cancellation_policy,
  meta_title,
  meta_description,
  review_count,
  avg_rating
) VALUES (
  'kefalonia-city-apartment',
  'Modern Apartment in the Heart of Kefalonia',
  'Your perfect base to explore the city of Kefalonia',
  E'A bright, fully equipped modern apartment located in the heart of Kefalonia city — walking distance to the waterfront promenade, local tavernas, the Byzantine fortress, and the beach.\n\nThe apartment spans 75m² and features an open-plan kitchen and living area, a comfortable double bedroom, and a bright studio sleeping area ideal for two additional guests. The balcony looks out over the rooftops toward the sea.\n\nPerfect for couples, small families, or friends exploring northeastern Greece. You''ll have the whole apartment to yourself with self check-in via lockbox.\n\nKefalonia is one of the most beautiful port cities in Greece — built amphitheatrically on a hillside, with a charming old town (Panagia quarter), a Roman aqueduct, a Byzantine castle, fresh seafood on every corner, and some of the best local beaches within 10 minutes.',
  'apartment',
  'Kefalonia City Centre',
  'Kefalonia',
  'East Macedonia and Thrace',
  'Greece',
  4,       -- max guests
  1,       -- bedrooms
  2,       -- beds (1 double + 1 sofa bed)
  1,       -- bathrooms
  65,      -- base price per night (EUR)
  40,      -- cleaning fee
  10,      -- extra guest fee per night
  2,       -- extra guest fee applies after 2 guests
  2,       -- min nights
  30,      -- max nights
  true,    -- instant booking
  true,    -- is active
  '15:00',
  '11:00',
  E'• No smoking inside the apartment\n• No parties or events\n• Pets not allowed\n• Quiet hours: 22:00 – 09:00\n• Please respect neighbours\n• Self check-in via lockbox — instructions sent 24h before arrival',
  'moderate',
  'Modern Apartment in Kefalonia City Centre | KefaloniaBNB',
  'Book directly with KefaloniaBNB. Bright modern apartment in Kefalonia city centre, steps from the waterfront. Up to 4 guests. Best rate guaranteed.',
  0,
  0
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed amenities for the apartment
-- (assumes amenities table already has these keys from migration 001)
DO $$
DECLARE
  apt_id UUID;
  amenity_key TEXT;
  amenity_id UUID;
BEGIN
  SELECT id INTO apt_id FROM listings WHERE slug = 'kefalonia-city-apartment';
  IF apt_id IS NULL THEN RETURN; END IF;

  FOREACH amenity_key IN ARRAY ARRAY[
    'wifi', 'kitchen', 'washer', 'air_conditioning', 'balcony',
    'tv', 'free_parking', 'self_checkin', 'city_view',
    'coffee_maker', 'hair_dryer', 'iron', 'workspace',
    'fire_extinguisher', 'first_aid_kit', 'smoke_alarm'
  ] LOOP
    SELECT id INTO amenity_id FROM amenities WHERE key = amenity_key;
    IF amenity_id IS NOT NULL THEN
      INSERT INTO listing_amenities (listing_id, amenity_id)
        VALUES (apt_id, amenity_id)
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 4. Seed placeholder reviews for the apartment (can be deleted once real reviews come in)
DO $$
DECLARE
  apt_id UUID;
BEGIN
  SELECT id INTO apt_id FROM listings WHERE slug = 'kefalonia-city-apartment';
  IF apt_id IS NULL THEN RETURN; END IF;

  INSERT INTO reviews (listing_id, guest_name, guest_country, rating, title, body, is_published, is_verified, source, stay_date)
  VALUES
    (apt_id, 'Sophie M.', 'France', 5, 'Perfect Kefalonia base',
     'Wonderful apartment right in the city. Clean, well-equipped and the balcony view is lovely. Our host was super responsive. Will definitely come back!',
     true, false, 'manual', '2025-09-01'),
    (apt_id, 'Nikos P.', 'Greece', 5, 'Excellent location',
     'We walked everywhere — waterfront, old town, restaurants all within 5 minutes. The apartment is modern and very comfortable. Highly recommend!',
     true, false, 'manual', '2025-08-01'),
    (apt_id, 'Jana K.', 'Germany', 4, 'Great city stay',
     'Really nice apartment, well furnished with everything you need. Easy self check-in. Kefalonia is a beautiful city — much less touristy than other Greek destinations.',
     true, false, 'manual', '2025-07-01')
  ON CONFLICT DO NOTHING;

  -- Update aggregate rating
  UPDATE listings
    SET
      review_count = 3,
      avg_rating   = 4.7
    WHERE id = apt_id;
END $$;

-- 5. Add balcony amenity if missing (apartment needs it)
INSERT INTO amenities (key, label, icon, category)
  VALUES ('balcony', 'Balcony', '🌅', 'outdoor')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO amenities (key, label, icon, category)
  VALUES ('city_view', 'City view', '🏙️', 'outdoor')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO amenities (key, label, icon, category)
  VALUES ('workspace', 'Dedicated workspace', '💻', 'general')
  ON CONFLICT (key) DO NOTHING;

INSERT INTO amenities (key, label, icon, category)
  VALUES ('coffee_maker', 'Coffee maker', '☕', 'kitchen')
  ON CONFLICT (key) DO NOTHING;

-- Re-run the listing_amenities insert after new amenities are inserted
DO $$
DECLARE
  apt_id UUID;
  amenity_key TEXT;
  amenity_id UUID;
BEGIN
  SELECT id INTO apt_id FROM listings WHERE slug = 'kefalonia-city-apartment';
  IF apt_id IS NULL THEN RETURN; END IF;

  FOREACH amenity_key IN ARRAY ARRAY['balcony', 'city_view', 'workspace', 'coffee_maker'] LOOP
    SELECT id INTO amenity_id FROM amenities WHERE key = amenity_key;
    IF amenity_id IS NOT NULL THEN
      INSERT INTO listing_amenities (listing_id, amenity_id)
        VALUES (apt_id, amenity_id)
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
