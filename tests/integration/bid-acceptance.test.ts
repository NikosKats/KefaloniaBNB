// tests/integration/bid-acceptance.test.ts
// Tests the bid acceptance flow: accepted bid creates a job with correct
// financial fields; rejected bids are updated accordingly.
// Requires TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_KEY.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { FIXTURES } from '../fixtures/users';
import { LISTING_FIXTURES } from '../fixtures/listings';
import { calcCleaningFees } from '../../src/lib/financial';

const HAS_TEST_DB = !!(process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_KEY);

const service = HAS_TEST_DB
  ? createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_SERVICE_KEY!)
  : null;

const RUN     = Date.now();
const REQ_ID  = `req-${RUN}`;
const ELENA_BID_ID   = `bid-elena-${RUN}`;
const STAVROS_BID_ID = `bid-stavros-${RUN}`;
const JOB_ID  = `job-${RUN}`;

const itDB = HAS_TEST_DB ? it : it.skip;

describe('Bid acceptance — integration', () => {

  beforeAll(async () => {
    if (!service) return;
    await service.from('listings').upsert({ ...LISTING_FIXTURES.villaSunrise, is_test: true });

    // Insert cleaning request
    await service.from('cleaning_requests').insert({
      id:              REQ_ID,
      listing_id:      LISTING_FIXTURES.villaSunrise.id,
      owner_id:        FIXTURES.owners.nikos.id,
      cleaning_type:   'turnover',
      urgency:         'normal',
      requested_date:  '2026-07-19',
      earliest_time:   '10:00',
      latest_time:     '14:00',
      checklist_items: JSON.stringify(['Clean bathrooms', 'Change linen']),
      status:          'open',
      is_test:         true,
    });

    // Insert two bids
    await service.from('cleaning_matches').insert([
      {
        id:             ELENA_BID_ID,
        request_id:     REQ_ID,
        cleaner_id:     FIXTURES.cleaners.elena.id,
        proposed_price: 85,
        proposed_time:  '10:30',
        message:        'I know this villa well.',
        is_accepted:    null,
      },
      {
        id:             STAVROS_BID_ID,
        request_id:     REQ_ID,
        cleaner_id:     FIXTURES.cleaners.stavros.id,
        proposed_price: 70,
        proposed_time:  '11:00',
        message:        null,
        is_accepted:    null,
      },
    ]);
  });

  afterAll(async () => {
    if (!service) return;
    await service.from('cleaning_jobs').delete().eq('id', JOB_ID);
    await service.from('cleaning_matches').delete().in('id', [ELENA_BID_ID, STAVROS_BID_ID]);
    await service.from('cleaning_requests').delete().eq('id', REQ_ID);
  });

  // ── Accepting Elena's bid ─────────────────────────────────────────────────

  itDB('accepting bid creates job with correct financial fields', async () => {
    const fees = calcCleaningFees({ agreedPrice: 85 });

    const { data: job, error } = await service!
      .from('cleaning_jobs')
      .insert({
        id:              JOB_ID,
        match_id:        ELENA_BID_ID,
        request_id:      REQ_ID,
        cleaner_id:      FIXTURES.cleaners.elena.id,
        listing_id:      LISTING_FIXTURES.villaSunrise.id,
        owner_id:        FIXTURES.owners.nikos.id,
        scheduled_date:  '2026-07-19',
        scheduled_time:  '10:30',
        agreed_price:    85,
        platform_fee:    fees.platformFee,
        cleaner_payout:  fees.cleanerPayout,
        status:          'scheduled',
        stripe_environment: 'live',
        is_test:         true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(job!.agreed_price).toBe(85);
    expect(job!.platform_fee).toBe(8.50);
    expect(job!.cleaner_payout).toBe(76.50);
    expect(job!.status).toBe('scheduled');
    // Invariant: no money lost
    expect(
      Math.round((job!.platform_fee + job!.cleaner_payout) * 100) / 100
    ).toBe(job!.agreed_price);
  });

  itDB('accepted bid marked as is_accepted=true', async () => {
    const { error } = await service!
      .from('cleaning_matches')
      .update({ is_accepted: true })
      .eq('id', ELENA_BID_ID);

    expect(error).toBeNull();

    const { data } = await service!
      .from('cleaning_matches')
      .select('is_accepted')
      .eq('id', ELENA_BID_ID)
      .single();

    expect(data!.is_accepted).toBe(true);
  });

  itDB('rejected bid marked as is_accepted=false', async () => {
    const { error } = await service!
      .from('cleaning_matches')
      .update({ is_accepted: false })
      .eq('id', STAVROS_BID_ID);

    expect(error).toBeNull();

    const { data } = await service!
      .from('cleaning_matches')
      .select('is_accepted')
      .eq('id', STAVROS_BID_ID)
      .single();

    expect(data!.is_accepted).toBe(false);
  });

  itDB('request status updated to matched after acceptance', async () => {
    const { error } = await service!
      .from('cleaning_requests')
      .update({ status: 'matched' })
      .eq('id', REQ_ID);

    expect(error).toBeNull();

    const { data } = await service!
      .from('cleaning_requests')
      .select('status')
      .eq('id', REQ_ID)
      .single();

    expect(data!.status).toBe('matched');
  });

});
