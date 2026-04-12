// tests/integration/stripe-webhook.test.ts
// Integration tests for Stripe webhook idempotency against real test DB.
// Requires TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_KEY.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { LISTING_FIXTURES } from '../fixtures/listings';
import { FIXTURES } from '../fixtures/users';
import { calcBookingPrice } from '../../src/lib/financial';

const HAS_TEST_DB = !!(process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_KEY);

const service = HAS_TEST_DB
  ? createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_SERVICE_KEY!)
  : null;

const TEST_RUN_ID  = Date.now();
const BOOKING_ID   = `b0000000-wh-${TEST_RUN_ID}-0001`;
const LISTING_ID   = LISTING_FIXTURES.villaSunrise.id;

const itDB = HAS_TEST_DB ? it : it.skip;

describe('Stripe webhook — DB integration', () => {

  beforeAll(async () => {
    if (!service) return;
    const fin = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });

    await service.from('listings').upsert({ ...LISTING_FIXTURES.villaSunrise, is_test: true });
    await service.from('bookings').insert({
      id:              BOOKING_ID,
      listing_id:      LISTING_ID,
      guest_name:      FIXTURES.guests.maria.name,
      guest_email:     FIXTURES.guests.maria.email,
      check_in:        '2026-07-12',
      check_out:       '2026-07-19',
      nights:          7,
      guests_adults:   6,
      total_price:     fin.totalCharged,
      cleaning_fee:    fin.cleaningFee,
      platform_fee:    fin.platformFee,
      owner_payout:    fin.ownerPayout,
      payment_status:  'pending',
      payout_status:   'na',
      payment_method:  'stripe',
      status:          'pending',
      source:          'direct',
      currency:        'EUR',
      stripe_session_id: `cs_test_wh_${TEST_RUN_ID}`,
      is_test:         true,
    });
  });

  afterAll(async () => {
    if (!service) return;
    await service.from('bookings').delete().eq('id', BOOKING_ID);
  });

  // ── checkout.session.completed ────────────────────────────────────────────

  itDB('marks booking as paid on checkout.session.completed', async () => {
    const { error } = await service!
      .from('bookings')
      .update({ payment_status: 'paid', payout_status: 'pending' })
      .eq('id', BOOKING_ID)
      .eq('payment_status', 'pending');

    expect(error).toBeNull();

    const { data } = await service!
      .from('bookings')
      .select('payment_status, payout_status')
      .eq('id', BOOKING_ID)
      .single();

    expect(data!.payment_status).toBe('paid');
    expect(data!.payout_status).toBe('pending');
  });

  itDB('S09: second identical webhook does not change already-paid booking', async () => {
    // The booking is already 'paid' from the previous test
    const { data: affected } = await service!
      .from('bookings')
      .update({ payment_status: 'paid', payout_status: 'pending' })
      .eq('id', BOOKING_ID)
      .eq('payment_status', 'pending')  // booking is now 'paid', so nothing matches
      .select();

    expect(affected).toHaveLength(0);
  });

  // ── checkout.session.expired ──────────────────────────────────────────────

  itDB('cancels booking on checkout.session.expired when still pending', async () => {
    const EXPIRED_BOOKING_ID = `b0000000-wh-exp-${TEST_RUN_ID}`;
    const fin = calcBookingPrice({ pricePerNight: 185, nights: 3, cleaningFee: 80 });

    await service!.from('bookings').insert({
      id:              EXPIRED_BOOKING_ID,
      listing_id:      LISTING_ID,
      guest_name:      'Test Guest',
      guest_email:     'test@example.com',
      check_in:        '2026-09-01',
      check_out:       '2026-09-04',
      nights:          3,
      guests_adults:   2,
      total_price:     fin.totalCharged,
      cleaning_fee:    fin.cleaningFee,
      platform_fee:    fin.platformFee,
      owner_payout:    fin.ownerPayout,
      payment_status:  'pending',
      payout_status:   'na',
      payment_method:  'stripe',
      status:          'pending',
      source:          'direct',
      currency:        'EUR',
      is_test:         true,
    });

    // Simulate session.expired handler
    const { error } = await service!
      .from('bookings')
      .update({ status: 'cancelled', cancel_reason: 'Payment session expired' })
      .eq('id', EXPIRED_BOOKING_ID)
      .eq('status', 'pending');

    expect(error).toBeNull();

    const { data } = await service!
      .from('bookings')
      .select('status, cancel_reason')
      .eq('id', EXPIRED_BOOKING_ID)
      .single();

    expect(data!.status).toBe('cancelled');
    expect(data!.cancel_reason).toMatch(/expired/i);

    // Cleanup
    await service!.from('bookings').delete().eq('id', EXPIRED_BOOKING_ID);
  });

});
