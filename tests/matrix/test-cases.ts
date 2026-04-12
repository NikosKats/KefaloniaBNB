// tests/matrix/test-cases.ts
// Documentation-as-code: each entry becomes a test case.
// Use this as the source of truth when writing E2E and integration tests.

export const TEST_MATRIX = {

  guest: {
    listings: [
      'can view all active listings without login',
      'can filter listings by guest count',
      'can filter listings by bedrooms',
      'can filter by beach_access amenity',
      'can filter by pet_friendly amenity',
      'cannot see is_test=true listings',
      'cannot see inactive listings',
      'sees correct price per night and cleaning fee',
      'sees availability calendar with booked dates blocked',
    ],
    booking: [
      'can book by card via Stripe checkout',
      'cannot book overlapping dates',
      'cannot book with fewer than minimum nights',
      'receives confirmation email after card payment',
      'can request-to-book by bank transfer',
      'bank transfer request is pending until admin confirms',
      'cannot access /admin/* routes',
      'cannot access /cleaner/* routes',
      'cannot access another guest booking',
    ],
    stripe: [
      'Stripe checkout created with correct amount',
      'Stripe checkout uses LIVE keys for public flow',
      'webhook success marks booking as paid',
      'duplicate webhook does not double-pay',
      'failed payment does not confirm booking',
    ],
  },

  owner: {
    listings: [
      'can submit new listing (lands in pending)',
      'cannot publish own listing without admin approval',
      'cannot see other owners listings in dashboard',
      'can edit own listing details',
      'can add/remove photos',
    ],
    bookings: [
      'can see all bookings for own properties only',
      'cannot see bookings for other owners properties',
      'sees correct payout amount per booking',
      'sees payment status correctly',
      'can approve bank transfer request',
    ],
    payouts: [
      'pending payout appears after booking paid',
      'payout transferred when Stripe connected and booking paid',
      'sees manual_paid status when admin marks manually',
    ],
    cleaning: [
      'can create cleaning request with all fields',
      'checklist template saves correctly',
      'template auto-loads on property select',
      'can see all bids on own request',
      'cannot see bids on another owners request',
      'can accept exactly one bid per request',
      'cannot accept second bid after first accepted',
      'receives notification and email when bid received',
      'receives notification when cleaner starts job',
      'receives notification when job complete',
      'can approve completed job',
      'can raise dispute on completed job',
      'approved job triggers cleaner payout',
    ],
  },

  cleaner: [
    'can see all open cleaning requests',
    'can see request details and checklist',
    'cannot see guest personal information in request',
    'cannot see other cleaners bids on same request',
    'can submit bid with price, time, message',
    'cannot submit duplicate bid on same request',
    'cannot bid on own-accepted job',
    'can see accepted job details',
    'receives job access info after bid accepted',
    'can start job and timestamp recorded',
    'cannot start job twice',
    'can check off checklist items',
    'can upload before photos',
    'can upload after photos',
    'can mark job complete',
    'cannot mark complete without checklist done (if enforced)',
    'cannot mark complete twice',
    'receives payout after owner approval',
    'sees correct payout amount (agreed_price minus fee)',
    'cannot access /admin/* routes',
    'cannot access another cleaners job',
  ],

  superAdmin: [
    'sees all listings regardless of owner',
    'can activate pending listing',
    'can reject listing',
    'can deactivate active listing',
    'can invite owner account',
    'can activate cleaner account',
    'can deactivate cleaner account',
    'can see all bookings platform-wide',
    'can mark bank transfer booking as paid',
    'can mark manual payout as transferred',
    'can approve stale completed job',
    'can resolve dispute (approve/reject/partial)',
    'sees platform-wide revenue and fees',
    'can post/edit/delete site banners',
    'can view owner portal in admin-view mode',
    'can view cleaner portal in admin-view mode',
    'can enable personal test mode (only affects own session)',
    'test mode does not affect public users',
    'test mode shows banner on own pages only',
    'test mode uses Stripe test keys for own checkouts only',
    'can disable test mode and return to live',
    'test mode audit log entry created on every toggle',
  ],

  crossEntity: {
    financialReconciliation: [
      'booking gross = nights × price_per_night + cleaning_fee',
      'owner_payout = total - platform_fee (configurable %)',
      'cleaning platform_fee = agreed_price × 0.10',
      'cleaner_payout = agreed_price - cleaning_platform_fee',
      'platform total income = booking_fee + cleaning_fee',
      'no payout issued if job in disputed status',
      'no payout issued if job cancelled',
    ],
    notifications: [
      'owner notified when cleaner bids',
      'all cleaners notified when owner posts request',
      'cleaner notified when bid accepted',
      'losing cleaners notified when bid rejected',
      'owner notified when job started',
      'owner notified when job completed',
      'cleaner notified when job approved',
      'cleaner notified when dispute raised',
    ],
    security: [
      'owner A cannot read owner B listings via API',
      'owner A cannot read owner B bookings via API',
      'cleaner cannot read another cleaners job via API',
      'guest cannot POST to /api/admin/*',
      'property_owner cannot POST to /api/admin/listings (approve)',
      'unauth cannot access any protected API',
    ],
  },

} as const;

// ─── Flat list helpers ─────────────────────────────────────────────────────────
// Useful for generating test.each() tables or counting total cases

export function flattenMatrix(): Array<{ role: string; category: string; case: string }> {
  const rows: Array<{ role: string; category: string; case: string }> = [];

  for (const [cat, val] of Object.entries(TEST_MATRIX.guest)) {
    for (const c of val as readonly string[]) {
      rows.push({ role: 'guest', category: cat, case: c });
    }
  }
  for (const [cat, val] of Object.entries(TEST_MATRIX.owner)) {
    for (const c of val as readonly string[]) {
      rows.push({ role: 'owner', category: cat, case: c });
    }
  }
  for (const c of TEST_MATRIX.cleaner) {
    rows.push({ role: 'cleaner', category: 'general', case: c });
  }
  for (const c of TEST_MATRIX.superAdmin) {
    rows.push({ role: 'super_admin', category: 'general', case: c });
  }
  for (const [cat, val] of Object.entries(TEST_MATRIX.crossEntity)) {
    for (const c of val as readonly string[]) {
      rows.push({ role: 'cross', category: cat, case: c });
    }
  }

  return rows;
}
