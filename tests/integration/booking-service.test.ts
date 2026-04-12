// tests/integration/booking-service.test.ts
// Integration tests against a real test Supabase project.
// Requires TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_KEY in .env.test.local.
// These tests are skipped automatically when env vars are absent.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { FIXTURES } from '../fixtures/users';
import { LISTING_FIXTURES } from '../fixtures/listings';
import { calcBookingPrice } from '../../src/lib/financial';

const HAS_TEST_DB = !!(process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_KEY);

const service = HAS_TEST_DB
  ? createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_SERVICE_KEY!)
  : null;

const TEST_RUN_ID = Date.now();
const BOOKING_ID_1 = `b0000000-test-${TEST_RUN_ID}-0001`;
const BOOKING_ID_2 = `b0000000-test-${TEST_RUN_ID}-0002`;
const LISTING_ID   = LISTING_FIXTURES.villaSunrise.id;

const itDB = HAS_TEST_DB ? it : it.skip;

describe('Booking service — integration', () => {

  beforeAll(async () => {
    if (!service) return;
    // Ensure listing exists
    await service.from('listings').upsert({
      ...LISTING_FIXTURES.villaSunrise,
      is_test: true,
    });
  });

  afterAll(async () => {
    if (!service) return;
    await service.from('bookings').delete().in('id', [BOOKING_ID_1, BOOKING_ID_2]);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  itDB('creates booking with correct financial fields', async () => {
    const financials = calcBookingPrice({
      pricePerNight: 185,
      nights: 7,
      cleaningFee: 80,
    });

    const { data, error } = await service!
      .from('bookings')
      .insert({
        id:              BOOKING_ID_1,
        listing_id:      LISTING_ID,
        guest_name:      FIXTURES.guests.maria.name,
        guest_email:     FIXTURES.guests.maria.email,
        check_in:        '2026-07-12',
        check_out:       '2026-07-19',
        nights:          7,
        guests_adults:   6,
        total_price:     financials.totalCharged,
        cleaning_fee:    financials.cleaningFee,
        platform_fee:    financials.platformFee,
        owner_payout:    financials.ownerPayout,
        payment_status:  'pending',
        payout_status:   'na',
        payment_method:  'stripe',
        status:          'pending',
        source:          'direct',
        currency:        'EUR',
        is_test:         true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.total_price).toBe(1375);
    expect(data!.platform_fee).toBe(206.25);
    expect(data!.owner_payout).toBe(1168.75);
    // Invariant
    expect(
      Math.round((data!.platform_fee + data!.owner_payout) * 100) / 100
    ).toBe(data!.total_price);
  });

  itDB('payment_status defaults to pending', async () => {
    const { data } = await service!
      .from('bookings')
      .select('payment_status')
      .eq('id', BOOKING_ID_1)
      .single();

    expect(data!.payment_status).toBe('pending');
  });

  // ── Idempotency: webhook conditional update ────────────────────────────────

  itDB('webhook update sets payment_status to paid when pending', async () => {
    const { error } = await service!
      .from('bookings')
      .update({ payment_status: 'paid', payout_status: 'pending' })
      .eq('id', BOOKING_ID_1)
      .eq('payment_status', 'pending');   // idempotency guard

    expect(error).toBeNull();

    const { data } = await service!
      .from('bookings')
      .select('payment_status, payout_status')
      .eq('id', BOOKING_ID_1)
      .single();

    expect(data!.payment_status).toBe('paid');
    expect(data!.payout_status).toBe('pending');
  });

  itDB('second identical webhook update affects zero rows (already paid)', async () => {
    const { data: affected } = await service!
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', BOOKING_ID_1)
      .eq('payment_status', 'pending')  // booking is now 'paid', so this matches nothing
      .select();

    expect(affected).toHaveLength(0);
  });

  // ── Date overlap ──────────────────────────────────────────────────────────

  itDB('second booking on same listing + different dates succeeds', async () => {
    const financials = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });

    const { error } = await service!
      .from('bookings')
      .insert({
        id:             BOOKING_ID_2,
        listing_id:     LISTING_ID,
        guest_name:     FIXTURES.guests.kostas.name,
        guest_email:    FIXTURES.guests.kostas.email,
        check_in:       '2026-07-26',  // non-overlapping with BOOKING_ID_1
        check_out:      '2026-08-02',
        nights:         7,
        guests_adults:  4,
        total_price:    financials.totalCharged,
        cleaning_fee:   financials.cleaningFee,
        platform_fee:   financials.platformFee,
        owner_payout:   financials.ownerPayout,
        payment_status: 'pending',
        payout_status:  'na',
        payment_method: 'bank_transfer',
        status:         'pending',
        source:         'direct',
        currency:       'EUR',
        is_test:        true,
      });

    expect(error).toBeNull();
  });

});
