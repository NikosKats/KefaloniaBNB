// tests/fixtures/bookings.ts
// Canonical booking records used in financial reconciliation and E2E tests.

import type { TestBooking } from '../types/domain';

export const BOOKING_FIXTURES = {

  // ── Scenario S01: Maria — card payment, confirmed and paid ───────────────────
  mariaPaidCard: {
    id:                     'b0000000-0000-8000-b000-000000000001',
    listing_id:             'a0000000-0000-7000-a000-000000000001', // Villa Sunrise
    guest_name:             'Maria Konstantinou',
    guest_email:            'maria.k@example.com',
    check_in:               '2026-07-12',
    check_out:              '2026-07-19',
    nights:                 7,
    guests:                 6,
    total_price:            1375.00,
    cleaning_fee:           80.00,
    platform_fee:           206.25,   // 15% of 1375
    owner_payout:           1168.75,  // 1375 − 206.25
    payment_status:         'paid' as const,
    payout_status:          'transferred' as const,
    stripe_checkout_session: 'cs_live_maria_001',
    stripe_environment:     'live' as const,
    is_test:                false,
  } satisfies TestBooking,

  // ── Scenario S02: Kostas — bank transfer, pending ────────────────────────────
  kostasBankPending: {
    id:                     'b0000000-0000-8000-b000-000000000002',
    listing_id:             'a0000000-0000-7000-a000-000000000001', // Villa Sunrise
    guest_name:             'Kostas Alexiou',
    guest_email:            'kostas.a@example.com',
    check_in:               '2026-07-26',
    check_out:              '2026-08-02',
    nights:                 7,
    guests:                 4,
    total_price:            1375.00,
    cleaning_fee:           80.00,
    platform_fee:           206.25,
    owner_payout:           1168.75,
    payment_status:         'pending' as const,
    payout_status:          'na' as const,
    stripe_checkout_session: null,
    stripe_environment:     'live' as const,
    is_test:                false,
  } satisfies TestBooking,

  // ── Scenario S09: duplicate webhook test (already paid) ──────────────────────
  thomasAlreadyPaid: {
    id:                     'b0000000-0000-8000-b000-000000000003',
    listing_id:             'a0000000-0000-7000-a000-000000000002', // Sea View Studio
    guest_name:             'Thomas Weber',
    guest_email:            'thomas.w@example.de',
    check_in:               '2026-08-10',
    check_out:              '2026-08-14',
    nights:                 4,
    guests:                 2,
    total_price:            330.00,   // 4 × 75 + 30
    cleaning_fee:           30.00,
    platform_fee:           49.50,    // 15% of 330
    owner_payout:           280.50,
    payment_status:         'paid' as const,
    payout_status:          'pending' as const,
    stripe_checkout_session: 'cs_live_thomas_001',
    stripe_environment:     'live' as const,
    is_test:                false,
  } satisfies TestBooking,

} as const;

// ─── Financial invariant helper ────────────────────────────────────────────────

/**
 * Assert that a booking record satisfies the no-money-lost invariant.
 * Use this in integration and E2E tests after writing booking rows to the DB.
 */
export function assertBookingFinancials(
  booking: { total_price: number; platform_fee: number; owner_payout: number },
  expected: { total: number; platformFee: number; ownerPayout: number },
) {
  if (booking.total_price !== expected.total) {
    throw new Error(`total_price: expected ${expected.total}, got ${booking.total_price}`);
  }
  if (booking.platform_fee !== expected.platformFee) {
    throw new Error(`platform_fee: expected ${expected.platformFee}, got ${booking.platform_fee}`);
  }
  if (booking.owner_payout !== expected.ownerPayout) {
    throw new Error(`owner_payout: expected ${expected.ownerPayout}, got ${booking.owner_payout}`);
  }
  // Invariant: no money lost
  const sum = Math.round((booking.platform_fee + booking.owner_payout) * 100) / 100;
  if (sum !== booking.total_price) {
    throw new Error(`Invariant violated: platform_fee + owner_payout (${sum}) ≠ total_price (${booking.total_price})`);
  }
}
