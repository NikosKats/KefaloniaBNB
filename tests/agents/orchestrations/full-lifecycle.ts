// tests/agents/orchestrations/full-lifecycle.ts
// Scenario S01: Full booking lifecycle with cleaning job.
// Orchestrates GuestAgent + OwnerAgent + CleanerAgent + AdminAgent
// in sequence to produce a fully approved cleaning job.

import { GuestAgent }   from '../GuestAgent';
import { OwnerAgent }   from '../OwnerAgent';
import { CleanerAgent } from '../CleanerAgent';
import { AdminAgent }   from '../AdminAgent';
import { FIXTURES }     from '../../fixtures/users';
import { CLEANING_FIXTURES } from '../../fixtures/cleaning';

export interface LifecycleResult {
  bookingId:  string;
  requestId:  string;
  matchId:    string;
  jobId:      string;
}

/**
 * Run the full S01 lifecycle end-to-end.
 *
 * @param baseUrl  The base URL of the running app (e.g. http://localhost:4321)
 * @param fetch    The fetch implementation to use (globalThis.fetch or Playwright's)
 * @param options  Override specific fixture IDs if needed
 */
export async function runFullLifecycle(
  baseUrl: string,
  fetch: typeof globalThis.fetch,
  options: {
    listingId?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  } = {},
): Promise<LifecycleResult> {
  const listingId = options.listingId ?? 'a0000000-0000-7000-a000-000000000001';
  const checkIn   = options.checkIn   ?? '2026-07-12';
  const checkOut  = options.checkOut  ?? '2026-07-19';
  const guests    = options.guests    ?? 6;

  const admin   = new AdminAgent(FIXTURES.superAdmin,        baseUrl);
  const guest   = new GuestAgent(FIXTURES.guests.maria,      baseUrl);
  const owner   = new OwnerAgent(FIXTURES.owners.nikos,      baseUrl);
  const cleaner = new CleanerAgent(FIXTURES.cleaners.elena,  baseUrl);

  // ── Step 1: Admin activates listing ────────────────────────────────────────
  await admin.login(fetch);
  await admin.activateListing(fetch, listingId);

  // ── Step 2: Guest books by card ────────────────────────────────────────────
  const { bookingId } = await guest.initiateCardBooking(fetch, {
    listingId, checkIn, checkOut, guests,
  });

  // ── Step 3: Simulate Stripe payment received ───────────────────────────────
  // In a real E2E test, use Stripe test mode and navigate the checkout.
  // Here we directly trigger the webhook handler in test mode.
  await admin.simulateStripeWebhook(fetch, {
    type:       'checkout.session.completed',
    bookingId,
    listingId,
    amountTotal: 137500,   // €1,375.00 in cents
    paymentType: 'full',
  });

  // ── Step 4: Owner creates cleaning request ─────────────────────────────────
  await owner.login(fetch);
  const { id: requestId } = await owner.createCleaningRequest(fetch, {
    listingId,
    bookingId,
    requestedDate:  checkOut,
    checklistItems: CLEANING_FIXTURES.requestJuly19.checklist_items,
    saveAsTemplate: true,
    templateName:   'Villa Sunrise Standard Turnover',
  });

  // ── Step 5: Cleaner submits bid ────────────────────────────────────────────
  await cleaner.login(fetch);
  const { id: matchId } = await cleaner.submitBid(fetch, requestId, {
    price:   85,
    time:    '10:30',
    message: 'I know this villa well.',
  });

  // ── Step 6: Owner accepts bid ──────────────────────────────────────────────
  const { jobId } = await owner.acceptBid(fetch, requestId, matchId);

  // ── Step 7: Cleaner executes the job ──────────────────────────────────────
  await cleaner.startJob(fetch, jobId);
  await cleaner.uploadPhotos(fetch, jobId, 'before', 8);

  // Fetch checklist items from API so we have the real IDs
  const checklistRes = await fetch(`${baseUrl}/api/cleaning/jobs/${jobId}/checklist`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const checklistItems = await checklistRes.json() as Array<{ id: string }>;
  await cleaner.completeChecklist(fetch, jobId, checklistItems.map(i => i.id));
  await cleaner.uploadPhotos(fetch, jobId, 'after', 14);
  await cleaner.markComplete(fetch, jobId);

  // ── Step 8: Owner approves job ─────────────────────────────────────────────
  await owner.approveJob(fetch, jobId);

  return { bookingId, requestId, matchId, jobId };
}

// ─── Scenario S02: Bank transfer booking ──────────────────────────────────────

export async function runBankTransferBooking(
  baseUrl: string,
  fetch: typeof globalThis.fetch,
): Promise<{ bookingId: string }> {
  const admin = new AdminAgent(FIXTURES.superAdmin,   baseUrl);
  const guest = new GuestAgent(FIXTURES.guests.kostas, baseUrl);

  const { bookingId } = await guest.initiateBankTransferBooking(fetch, {
    listingId:  'a0000000-0000-7000-a000-000000000001',
    checkIn:    '2026-07-26',
    checkOut:   '2026-08-02',
    guests:     4,
  });

  // Admin marks as paid (simulates manual bank transfer confirmation)
  await admin.login(fetch);
  await admin.markBookingPaid(fetch, bookingId);
  await admin.markPayoutManual(fetch, bookingId);

  return { bookingId };
}

// ─── Scenario S07: Owner disputes a completed job ─────────────────────────────

export async function runDisputeFlow(
  baseUrl: string,
  fetch: typeof globalThis.fetch,
  jobId: string,
  disputeId: string,
): Promise<void> {
  const owner = new OwnerAgent(FIXTURES.owners.nikos, baseUrl);
  const admin = new AdminAgent(FIXTURES.superAdmin,   baseUrl);

  await owner.login(fetch);
  await owner.disputeJob(fetch, jobId, '2 bathrooms were not cleaned properly.');

  await admin.login(fetch);
  await admin.resolveDispute(fetch, disputeId, {
    status:         'resolved',
    notes:          'Reviewed photos — partial payout approved.',
    overrideAmount: 60,
  });
}
