// tests/scenarios/scenario-descriptions.ts
// Narrative end-to-end scenarios used to guide E2E test authoring.
// Each scenario maps to one or more Playwright spec files.

export interface ScenarioStep {
  actor: 'guest' | 'owner' | 'cleaner' | 'super_admin' | 'system';
  action: string;
}

export interface Scenario {
  id: string;
  name: string;
  entities: ReadonlyArray<'guest' | 'owner' | 'cleaner' | 'super_admin'>;
  steps: ReadonlyArray<string | ScenarioStep>;
  assertions: ReadonlyArray<string>;
  tags?: ReadonlyArray<string>;
}

export const SCENARIOS: ReadonlyArray<Scenario> = [

  {
    id: 'S01',
    name: 'Full booking lifecycle with cleaning job',
    entities: ['guest', 'owner', 'cleaner', 'super_admin'],
    tags: ['critical', 'happy-path'],
    steps: [
      'Super admin activates Nikos account and approves Villa Sunrise',
      'Guest Maria finds villa, books July 12–19, pays by card',
      'Stripe webhook fires, booking confirmed, Maria gets email',
      'Nikos sees booking notification and revenue update',
      'Nikos creates cleaning request for July 19 with saved template',
      'Elena receives email notification of new request',
      'Elena submits bid: €85, 10:30am',
      'Nikos accepts Elena bid',
      'Elena receives email with address, door code, Google Maps link',
      'July 19: Elena starts job at 10:35',
      'Elena checks off all 22 checklist items',
      'Elena uploads 8 before + 14 after photos',
      'Elena marks job complete',
      'Nikos approves: €76.50 transferred to Elena, €8.50 to platform',
    ],
    assertions: [
      'booking.payment_status === "paid"',
      'booking.owner_payout === 1168.75',
      'cleaning_job.cleaner_payout === 76.50',
      'cleaning_job.platform_fee === 8.50',
      'cleaning_job.status === "approved"',
      '22 checklist items all is_done === true',
      '22 photos uploaded (8 before + 14 after)',
      'cleaner payout record exists with amount 76.50',
    ],
  },

  {
    id: 'S02',
    name: 'Bank transfer booking request',
    entities: ['guest', 'owner', 'super_admin'],
    tags: ['happy-path', 'bank-transfer'],
    steps: [
      'Guest Kostas fills booking form, selects bank transfer',
      'Booking created with payment_status=pending, payout_status=na',
      'Owner Nikos sees request with Approve/Reject buttons via Telegram',
      'Nikos approves request from Telegram',
      'Kostas receives email with IBAN details',
      'Admin confirms payment received in admin dashboard',
      'booking.payment_status = paid, payout_status = pending',
      'Admin marks payout as manual_paid',
    ],
    assertions: [
      'booking.status === "confirmed"',
      'booking.payment_status === "paid"',
      'booking.payout_status === "manual_paid"',
    ],
  },

  {
    id: 'S03',
    name: 'Listing submission and admin approval',
    entities: ['owner', 'super_admin'],
    tags: ['listing-management'],
    steps: [
      'Nikos submits new listing "Beach Cottage" via /list-your-property',
      'Listing created with is_active=false, status=pending',
      'Listing does not appear on public /rentals page',
      'Admin sees listing in pending queue at /admin/listings',
      'Admin reviews listing and activates it',
      'Listing appears on public /rentals page',
    ],
    assertions: [
      'listing.is_active === true after admin activation',
      'listing visible on /rentals after activation',
      'listing NOT visible on /rentals before activation',
    ],
  },

  {
    id: 'S04',
    name: 'No cleaner bids — request expires',
    entities: ['owner'],
    tags: ['edge-case'],
    steps: [
      'Owner creates cleaning request',
      'No cleaners bid after 24 hours',
      'Owner sees zero bids on request dashboard',
      'Owner can cancel the request or extend deadline',
      'No job record created',
    ],
    assertions: [
      'cleaning_request.status === "open" throughout',
      'no cleaning_job record exists for this request',
    ],
  },

  {
    id: 'S05',
    name: 'Two bids — owner picks one',
    entities: ['owner', 'cleaner'],
    tags: ['happy-path', 'bidding'],
    steps: [
      'Elena submits bid: €85, message included',
      'Stavros submits bid: €70, no message',
      'Owner reviews both bids side by side',
      'Owner accepts Elena bid',
      'Elena bid.is_accepted = true',
      'Stavros receives "bid not selected" notification',
      'Stavros bid.is_accepted = false',
      'Request status changes to matched',
    ],
    assertions: [
      'elena_bid.is_accepted === true',
      'stavros_bid.is_accepted === false',
      'cleaning_request.status === "matched"',
      'cleaning_job record created for Elena',
    ],
  },

  {
    id: 'S06',
    name: 'Cleaner no-show — dispute and reassignment',
    entities: ['owner', 'cleaner', 'super_admin'],
    tags: ['dispute', 'edge-case'],
    steps: [
      'Elena accepted, job scheduled',
      'Elena does not start job, does not mark complete by checkout day',
      'Owner raises dispute: "cleaner did not show up"',
      'Admin reviews dispute, marks Elena as no-show',
      'Job cancelled, no payout to Elena',
      'Admin resets request to open for re-bidding',
      'New cleaner Stavros bids and is accepted',
      'New job created for Stavros',
    ],
    assertions: [
      'original cleaning_job.status === "cancelled"',
      'no payout record for Elena',
      'new cleaning_job created for Stavros',
      'cleaning_request.status === "matched" after reassignment',
    ],
  },

  {
    id: 'S07',
    name: 'Owner disputes completed job',
    entities: ['owner', 'cleaner', 'super_admin'],
    tags: ['dispute'],
    steps: [
      'Elena marks job complete, uploads photos',
      'Nikos reviews photos, sees missed checklist items',
      'Nikos raises dispute with reason "2 bathrooms not cleaned"',
      'Payout blocked: cleaning_job.status = disputed',
      'Admin reviews photos and checklist evidence',
      'Admin resolves: partial payout €60 instead of €85',
      'Elena payout record created for €54 (€60 − 10% fee)',
    ],
    assertions: [
      'cleaning_job.status === "disputed" while under review',
      'cleaning_job.status === "approved" after admin resolution',
      'cleaner_payout.amount === 54',
      'platform keeps €6 fee on partial amount',
    ],
  },

  {
    id: 'S08',
    name: 'Admin approves stale job after owner inactivity',
    entities: ['owner', 'cleaner', 'super_admin'],
    tags: ['admin', 'edge-case'],
    steps: [
      'Elena marks job complete',
      'Nikos does not approve or dispute for 48 hours',
      'Admin sees stale jobs in /admin/cleaning/jobs (overdue filter)',
      'Admin approves job on Nikos behalf',
      'Payout released to Elena at full agreed amount',
      'audit_log entry created: action=job.admin_approved',
    ],
    assertions: [
      'cleaning_job.status === "approved"',
      'cleaner_payout created at correct amount',
      'audit_log contains admin_approved action',
    ],
  },

  {
    id: 'S09',
    name: 'Duplicate Stripe webhook — idempotency',
    entities: ['guest'],
    tags: ['idempotency', 'stripe'],
    steps: [
      'checkout.session.completed fires once — booking marked paid',
      'Same event fires again (Stripe retry after timeout)',
      'Second handler: booking.payment_status already "paid", no update applied',
      'No duplicate payout created',
      'No duplicate confirmation email sent',
    ],
    assertions: [
      'booking.payment_status === "paid" (unchanged after second webhook)',
      'exactly one audit_log entry for booking.payment_received',
      'exactly one email sent to guest',
    ],
  },

  {
    id: 'S10',
    name: 'Payment success but DB write fails — webhook retry recovers',
    entities: ['guest'],
    tags: ['resilience', 'stripe'],
    steps: [
      'Stripe checkout completes successfully',
      'Webhook fires, DB update throws transient error',
      'Webhook handler returns 500',
      'Stripe retries webhook after 1 minute',
      'Retry succeeds, booking correctly marked paid',
      'Idempotency check prevents double-write on any further retries',
    ],
    assertions: [
      'booking.payment_status === "paid" after successful retry',
      'no duplicate payout records',
    ],
  },

  {
    id: 'S11',
    name: 'Stale double-submit booking',
    entities: ['guest'],
    tags: ['edge-case', 'idempotency'],
    steps: [
      'Guest clicks "Confirm & Pay" twice in quick succession',
      'Two POST /api/bookings/create requests sent simultaneously',
      'Second request sees dates no longer available (409)',
      'Only one booking record created',
      'Only one Stripe checkout session created',
    ],
    assertions: [
      'exactly one booking record for these dates',
      'second request returns 409 Conflict',
    ],
  },

] as const;

// ─── Lookup helpers ────────────────────────────────────────────────────────────

export function getScenario(id: string): Scenario {
  const found = SCENARIOS.find(s => s.id === id);
  if (!found) throw new Error(`Scenario ${id} not found`);
  return found;
}

export function getScenariosByTag(tag: string): ReadonlyArray<Scenario> {
  return SCENARIOS.filter(s => s.tags?.includes(tag));
}
