import type { Listing, Season, Booking, Coupon, DateRange } from '../../src/types/index.ts';

// ── Listing factory ────────────────────────────────────────────────────────────
export function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    slug: 'test-villa',
    title: 'Test Villa',
    tagline: 'A great test villa',
    description: 'Lovely place for testing.',
    property_type: 'villa',
    address: '1 Test Street',
    city: 'Keramoti',
    region: 'Kefalonia',
    country: 'Greece',
    latitude: 40.9716,
    longitude: 24.6736,
    map_embed_url: null,
    max_guests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    base_price: 100,
    cleaning_fee: 50,
    extra_guest_fee: 15,
    extra_guest_after: 4,
    min_nights: 3,
    max_nights: null,
    instant_booking: true,
    is_active: true,
    check_in_time: '15:00',
    check_out_time: '11:00',
    house_rules: 'No smoking.',
    checkin_instructions: null,
    deposit_percent: 30,
    cancellation_policy: 'moderate',
    meta_title: null,
    meta_description: null,
    review_count: 0,
    avg_rating: 0,
    owner_id: null,
    commission_rate: 10,
    telegram_channel_id: null,
    host_phone: null,
    host_whatsapp: false,
    host_viber: false,
    host_telegram: false,
    host_messaging_visible: false,
    allow_telegram_direct: false,
    offer_full_payment: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Season factory ─────────────────────────────────────────────────────────────
export function makeSeason(overrides: Partial<Season> = {}): Season {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    listing_id: '00000000-0000-0000-0000-000000000001',
    name: 'High Season',
    start_date: '2025-07-01',
    end_date: '2025-08-31',
    price_modifier: 1.5,
    min_nights: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Booking factory ────────────────────────────────────────────────────────────
export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: '00000000-0000-0000-0000-000000000020',
    listing_id: '00000000-0000-0000-0000-000000000001',
    status: 'confirmed',
    check_in: '2025-09-01',
    check_out: '2025-09-08',
    nights: 7,
    guests_adults: 2,
    guests_children: 0,
    guests_infants: 0,
    guests_pets: 0,
    base_price: 100,
    base_total: 700,
    cleaning_fee: 50,
    extra_guest_fee: 0,
    coupon_id: null,
    coupon_discount: 0,
    taxes: 0,
    total_price: 750,
    currency: 'EUR',
    guest_name: 'Alice Tester',
    guest_email: 'alice@example.com',
    guest_phone: '+306912345678',
    guest_country: 'Greece',
    guest_message: null,
    payment_method: 'stripe',
    payment_status: 'paid',
    stripe_payment_intent_id: 'pi_test_123',
    stripe_session_id: 'cs_test_123',
    amount_paid: 750,
    internal_notes: null,
    source: 'direct',
    confirmed_at: '2024-01-02T00:00:00Z',
    cancelled_at: null,
    cancel_reason: null,
    completed_at: null,
    telegram_message_id: null,
    platform_fee: 75,
    owner_payout: 675,
    payout_status: 'pending',
    payout_transfer_id: null,
    payout_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Coupon factory ─────────────────────────────────────────────────────────────
export function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: '00000000-0000-0000-0000-000000000030',
    code: 'TEST10',
    description: '10% off',
    discount_type: 'percent',
    discount_value: 10,
    min_nights: null,
    min_total: null,
    max_uses: null,
    uses_count: 0,
    valid_from: null,
    valid_until: null,
    is_active: true,
    listing_id: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── DateRange factory ──────────────────────────────────────────────────────────
export function makeDateRange(
  start: string,
  end: string,
  type: 'booked' | 'blocked' = 'booked'
): DateRange {
  return { start, end, type };
}

// ── Valid CreateBooking payload ────────────────────────────────────────────────
export function makeBookingPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    listing_id: '00000000-0000-0000-0000-000000000001',
    check_in: '2025-11-01',
    check_out: '2025-11-08',
    guests_adults: 2,
    guests_children: 0,
    guests_infants: 0,
    guests_pets: 0,
    guest_name: 'Alice Tester',
    guest_email: 'alice@example.com',
    payment_method: 'stripe',
    payment_type: 'full',
    ...overrides,
  };
}
