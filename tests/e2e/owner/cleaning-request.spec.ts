// tests/e2e/owner/cleaning-request.spec.ts
// E2E spec: owner creates a cleaning request, views bids, and accepts the best one.
// Corresponds to S01 steps 5–7: owner side of the cleaning workflow.

import { test, expect } from '@playwright/test';
import { OwnerAgent } from '../../agents/OwnerAgent';
import { CleanerAgent } from '../../agents/CleanerAgent';
import { FIXTURES } from '../../fixtures/users';
import { LISTING_FIXTURES } from '../../fixtures/listings';
import { CHECKLIST_TEMPLATE_STANDARD } from '../../fixtures/cleaning';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:4321';
const HAS_API  = !!process.env.TEST_BASE_URL;
const apiTest  = HAS_API ? test : test.skip;

// ── Owner agent setup ─────────────────────────────────────────────────────────

test.describe('Owner — cleaning request lifecycle', () => {

  let owner: OwnerAgent;
  let elena: CleanerAgent;
  let stavros: CleanerAgent;
  let requestId: string;

  test.beforeAll(async () => {
    owner = new OwnerAgent(
      {
        email:    FIXTURES.owners.nikos.email,
        password: FIXTURES.owners.nikos.password,
        id:       FIXTURES.owners.nikos.id,
      },
      BASE_URL,
    );
    await owner.login(fetch);

    elena = new CleanerAgent(
      {
        email:    FIXTURES.cleaners.elena.email,
        password: FIXTURES.cleaners.elena.password,
        id:       FIXTURES.cleaners.elena.id,
      },
      BASE_URL,
    );
    await elena.login(fetch);

    stavros = new CleanerAgent(
      {
        email:    FIXTURES.cleaners.stavros.email,
        password: FIXTURES.cleaners.stavros.password,
        id:       FIXTURES.cleaners.stavros.id,
      },
      BASE_URL,
    );
    await stavros.login(fetch);
  });

  // ── Create request ────────────────────────────────────────────────────────

  apiTest('owner can log in and see their listings', async () => {
    const listings = await owner.getMyListings(fetch);
    const ids = listings.map(l => l.id);
    expect(ids).toContain(LISTING_FIXTURES.villaSunrise.id);
  });

  apiTest('owner creates a turnover cleaning request for Villa Sunrise', async () => {
    const result = await owner.createCleaningRequest(fetch, {
      listingId:      LISTING_FIXTURES.villaSunrise.id,
      requestedDate:  '2026-08-09',  // day after guest checkout
      earliestTime:   '10:00',
      latestTime:     '14:00',
      cleaningType:   'turnover',
      urgency:        'normal',
      checklistItems: [...CHECKLIST_TEMPLATE_STANDARD.items],
    });

    expect(result.id).toBeTruthy();
    requestId = result.id;
  });

  // ── Cleaners submit bids ──────────────────────────────────────────────────

  apiTest('Elena can see the open request and submit a bid', async () => {
    const requests = await elena.browseOpenRequests(fetch);
    expect(Array.isArray(requests)).toBe(true);

    const bid = await elena.submitBid(fetch, requestId, {
      price:   85,
      time:    '10:30',
      message: 'I know this villa well.',
    });
    expect(bid.id).toBeTruthy();
  });

  apiTest('Stavros submits a competing bid', async () => {
    const bid = await stavros.submitBid(fetch, requestId, {
      price:   70,
      time:    '11:00',
      message: null as unknown as undefined,
    });
    expect(bid.id).toBeTruthy();
  });

  // ── Owner reviews and picks ───────────────────────────────────────────────

  apiTest('owner views bids on their request', async () => {
    const bids = await owner.viewBids(fetch, requestId);
    expect(bids.length).toBeGreaterThanOrEqual(2);

    const prices = bids.map(b => b.proposed_price);
    expect(prices).toContain(85);
    expect(prices).toContain(70);
  });

  apiTest('owner picks the best bid using decision rule (lowest with message)', async () => {
    const bids = await owner.viewBids(fetch, requestId);
    const best = owner.pickBestBid(bids);

    // Elena has a message at €85, Stavros is cheaper but no message
    // Decision rule: pick lowest with message → Elena at €85
    expect(best.proposed_price).toBe(85);
    expect(best.message).toBeTruthy();
  });

  apiTest('owner accepts Elena\'s bid — job is created', async () => {
    const bids = await owner.viewBids(fetch, requestId);
    const best = owner.pickBestBid(bids);

    const result = await owner.acceptBid(fetch, requestId, best.id);
    expect(result.jobId).toBeTruthy();
  });

  // ── Post-acceptance state ─────────────────────────────────────────────────

  apiTest('after acceptance, Stavros\'s bid is rejected (is_accepted=false)', async () => {
    const bids = await owner.viewBids(fetch, requestId);
    const stavrosBid = bids.find(b => b.proposed_price === 70);
    if (stavrosBid) {
      expect(stavrosBid.is_accepted).toBe(false);
    }
  });

  // ── Role isolation ────────────────────────────────────────────────────────

  apiTest('Stavros cannot view owner\'s bookings (403)', async () => {
    const res = await stavros.attemptAction(fetch, '/api/owner/bookings');
    expect(res.status).toBe(403);
  });

  apiTest('unauthenticated user cannot create a cleaning request (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/cleaning/requests`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id:      LISTING_FIXTURES.villaSunrise.id,
        cleaning_type:   'turnover',
        urgency:         'normal',
        requested_date:  '2026-09-01',
        checklist_items: [],
      }),
    });
    expect([401, 403]).toContain(res.status);
  });

});
