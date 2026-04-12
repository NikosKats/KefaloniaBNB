// tests/fixtures/listings.ts
// Canonical listing records referenced by booking and cleaning fixtures.

import type { TestListing } from '../types/domain';

export const LISTING_FIXTURES = {

  // ── Active listings ──────────────────────────────────────────────────────────

  villaSunrise: {
    id:             'a0000000-0000-7000-a000-000000000001',
    owner_id:       '00000000-0000-0000-0000-bbbbbbbbbb10', // Nikos
    title:          'Villa Sunrise — Keramoti Beachfront',
    slug:           'villa-sunrise-keramoti',
    city:           'Keramoti',
    property_type:  'villa' as const,
    bedrooms:       4,
    max_guests:     8,
    price_per_night: 185,
    cleaning_fee:   80,
    min_nights:     3,
    is_active:      true,
    is_test:        false,
    lat:            40.9716,
    lng:            24.6736,
    description:    'A stunning 4-bedroom villa with private garden, outdoor kitchen, and direct beach access on the pristine shores of Keramoti.',
    amenities:      ['beach_access', 'private_garden', 'outdoor_kitchen', 'wifi', 'air_conditioning', 'private_parking'],
  } satisfies TestListing,

  seaViewStudio: {
    id:             'a0000000-0000-7000-a000-000000000002',
    owner_id:       '00000000-0000-0000-0000-bbbbbbbbbb11', // Sofia
    title:          'Sea View Studio — Kefalonia Harbour',
    slug:           'sea-view-studio-kefalonia',
    city:           'Kefalonia',
    property_type:  'studio' as const,
    bedrooms:       1,
    max_guests:     2,
    price_per_night: 75,
    cleaning_fee:   30,
    min_nights:     2,
    is_active:      true,
    is_test:        false,
    lat:            40.9395,
    lng:            24.4017,
    description:    'A charming studio overlooking Kefalonia\'s ancient harbour. Perfect for couples.',
    amenities:      ['wifi', 'air_conditioning', 'sea_view'],
  } satisfies TestListing,

  // ── Pending (not yet approved) ───────────────────────────────────────────────

  pendingCottage: {
    id:             'a0000000-0000-7000-a000-000000000003',
    owner_id:       '00000000-0000-0000-0000-bbbbbbbbbb11', // Sofia
    title:          'Beach Cottage — Parakila',
    slug:           'beach-cottage-parakila',
    city:           'Parakila',
    property_type:  'house' as const,
    bedrooms:       2,
    max_guests:     4,
    price_per_night: 120,
    cleaning_fee:   50,
    min_nights:     2,
    is_active:      false,
    is_test:        false,
    lat:            40.8990,
    lng:            24.5820,
    description:    'Cosy 2-bedroom cottage steps from a quiet beach.',
    amenities:      ['beach_access', 'wifi'],
  } satisfies TestListing,

  // ── Demo / test-mode only (invisible to public) ───────────────────────────────

  demoVilla: {
    id:             'a0000000-0000-7000-a000-000000000099',
    owner_id:       '00000000-0000-0000-0000-bbbbbbbbbb10', // Nikos
    title:          '[DEMO] Test Villa — Keramoti',
    slug:           'demo-villa-keramoti',
    city:           'Keramoti',
    property_type:  'villa' as const,
    bedrooms:       3,
    max_guests:     6,
    price_per_night: 150,
    cleaning_fee:   60,
    min_nights:     1,
    is_active:      true,
    is_test:        true,  // ← never appears in public listing queries
    description:    'Internal demo listing used for admin test mode.',
    amenities:      ['wifi'],
  } satisfies TestListing,

} as const;

// ─── Lookup helpers ────────────────────────────────────────────────────────────

export const ALL_LISTINGS = Object.values(LISTING_FIXTURES);
export const ACTIVE_PUBLIC_LISTINGS = ALL_LISTINGS.filter(l => l.is_active && !l.is_test);
