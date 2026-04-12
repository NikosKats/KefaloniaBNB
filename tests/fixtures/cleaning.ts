// tests/fixtures/cleaning.ts
// Canonical cleaning requests, bids, jobs and templates used in tests.

import type {
  TestCleaningRequest,
  TestBid,
  TestCleaningJob,
} from '../types/domain';

// ─── Checklist template ───────────────────────────────────────────────────────

export const CHECKLIST_TEMPLATE_STANDARD = {
  id:         'e0000000-0000-8000-e000-000000000001',
  owner_id:   '00000000-0000-0000-0000-bbbbbbbbbb10', // Nikos
  listing_id: 'a0000000-0000-7000-a000-000000000001', // Villa Sunrise
  name:       'Villa Sunrise Standard Turnover',
  items: [
    'Strip all beds and replace with fresh linen',
    'Clean master bathroom — scrub toilet, sink, shower',
    'Restock toiletries in master bathroom',
    'Clean second bathroom',
    'Restock toiletries in second bathroom',
    'Clean third bathroom',
    'Mop all tile floors',
    'Vacuum all rugs and carpets',
    'Clean kitchen counters and surfaces',
    'Clean hobs and oven interior',
    'Clean fridge interior and remove old food',
    'Empty and replace all bin liners',
    'Wipe all mirrors',
    'Dust all surfaces and shelves',
    'Clean patio and outdoor furniture',
    'Sweep outdoor area',
    'Check pool pump is running',
    'Skim pool for debris',
    'Restock welcome basket (water, local olives, bread)',
    'Check all light bulbs are working',
    'Close all shutters and windows',
    'Set air conditioning to 24°C',
  ] as readonly string[],
} as const;

// ─── Cleaning requests ────────────────────────────────────────────────────────

export const CLEANING_FIXTURES = {

  // Scenario S01: open request linked to Maria's booking
  requestJuly19: {
    id:             'c0000000-0000-7000-c000-000000000001',
    listing_id:     'a0000000-0000-7000-a000-000000000001',
    owner_id:       '00000000-0000-0000-0000-bbbbbbbbbb10',
    booking_id:     'b0000000-0000-8000-b000-000000000001', // Maria's booking
    cleaning_type:  'turnover' as const,
    urgency:        'normal' as const,
    requested_date: '2026-07-19',
    earliest_time:  '10:00',
    latest_time:    '14:00',
    property_size:  180,
    notes:          'Please check the pool pump is running. Keys in lockbox code 4872.',
    checklist_items: CHECKLIST_TEMPLATE_STANDARD.items as unknown as string[],
    status:         'open' as const,
    is_test:        false,
  } satisfies TestCleaningRequest,

  // Scenario S04: request with no bids
  requestNoBids: {
    id:             'c0000000-0000-7000-c000-000000000002',
    listing_id:     'a0000000-0000-7000-a000-000000000002',
    owner_id:       '00000000-0000-0000-0000-bbbbbbbbbb11', // Sofia
    cleaning_type:  'deep_clean' as const,
    urgency:        'urgent' as const,
    requested_date: '2026-08-01',
    earliest_time:  '09:00',
    latest_time:    '13:00',
    checklist_items: [
      'Deep clean all bathrooms',
      'Clean inside all kitchen appliances',
      'Wash all windows inside and out',
    ],
    status:         'open' as const,
    is_test:        false,
  } satisfies TestCleaningRequest,

} as const;

// ─── Bids ─────────────────────────────────────────────────────────────────────

export const BID_FIXTURES = {

  elenaBid: {
    id:             'd0000000-0000-8000-d000-000000000001',
    request_id:     'c0000000-0000-7000-c000-000000000001',
    cleaner_id:     '00000000-0000-0000-0000-cccccccccc20', // Elena
    proposed_price: 85,
    proposed_time:  '10:30',
    message:        'I have done this villa before, I know the layout well.',
    is_accepted:    null,
  } satisfies TestBid,

  stavrosBid: {
    id:             'd0000000-0000-8000-d000-000000000002',
    request_id:     'c0000000-0000-7000-c000-000000000001',
    cleaner_id:     '00000000-0000-0000-0000-cccccccccc21', // Stavros
    proposed_price: 70,
    proposed_time:  '11:00',
    message:        null,
    is_accepted:    null,
  } satisfies TestBid,

} as const;

// ─── Job ─────────────────────────────────────────────────────────────────────

export const JOB_FIXTURES = {

  // After Elena's bid is accepted (Scenario S01)
  jobJuly19Scheduled: {
    id:              'f0000000-0000-8000-f000-000000000001',
    match_id:        'd0000000-0000-8000-d000-000000000001', // Elena's bid
    request_id:      'c0000000-0000-7000-c000-000000000001',
    cleaner_id:      '00000000-0000-0000-0000-cccccccccc20', // Elena
    listing_id:      'a0000000-0000-7000-a000-000000000001',
    owner_id:        '00000000-0000-0000-0000-bbbbbbbbbb10',
    scheduled_date:  '2026-07-19',
    scheduled_time:  '10:30',
    agreed_price:    85,
    platform_fee:    8.50,    // 10% of 85
    cleaner_payout:  76.50,   // 85 − 8.50
    status:          'scheduled' as const,
    is_test:         false,
    stripe_environment: 'live' as const,
  } satisfies TestCleaningJob,

} as const;

// ─── Financial invariant helper ────────────────────────────────────────────────

/**
 * Assert that a cleaning job record satisfies the no-money-lost invariant.
 */
export function assertCleaningFinancials(
  job: { agreed_price: number; platform_fee: number; cleaner_payout: number },
  expectedAgreedPrice: number,
) {
  const expectedFee    = Math.round(expectedAgreedPrice * 0.10 * 100) / 100;
  const expectedPayout = Math.round((expectedAgreedPrice - expectedFee) * 100) / 100;

  if (job.agreed_price !== expectedAgreedPrice) {
    throw new Error(`agreed_price: expected ${expectedAgreedPrice}, got ${job.agreed_price}`);
  }
  if (job.platform_fee !== expectedFee) {
    throw new Error(`platform_fee: expected ${expectedFee}, got ${job.platform_fee}`);
  }
  if (job.cleaner_payout !== expectedPayout) {
    throw new Error(`cleaner_payout: expected ${expectedPayout}, got ${job.cleaner_payout}`);
  }
  // Invariant
  const sum = Math.round((job.platform_fee + job.cleaner_payout) * 100) / 100;
  if (sum !== job.agreed_price) {
    throw new Error(`Invariant violated: platform_fee + cleaner_payout (${sum}) ≠ agreed_price (${job.agreed_price})`);
  }
}
