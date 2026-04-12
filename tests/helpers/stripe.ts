// tests/helpers/stripe.ts
// Builders for synthetic Stripe webhook event payloads.
// Use these in unit and integration tests to avoid hitting Stripe's API.

// ─── Event payload types ───────────────────────────────────────────────────────

export interface StripeSessionMetadata {
  booking_id:   string;
  listing_id?:  string;
  payment_type: 'full' | 'deposit';
}

export interface StripeCheckoutSession {
  id:             string;
  object:         'checkout.session';
  metadata:       StripeSessionMetadata;
  amount_total:   number;   // cents
  payment_intent: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  customer_email?: string;
}

export interface StripeWebhookEvent<T = unknown> {
  id:       string;
  object:   'event';
  type:     string;
  livemode: boolean;
  data:     { object: T };
  created:  number;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

export function makeCheckoutSession(
  overrides: Partial<StripeCheckoutSession> & { metadata: StripeSessionMetadata },
): StripeCheckoutSession {
  return {
    id:             `cs_test_${Date.now()}`,
    object:         'checkout.session',
    amount_total:   137500,    // €1375 in cents (default S01 amount)
    payment_intent: `pi_test_${Date.now()}`,
    payment_status: 'paid',
    ...overrides,
  };
}

export function makeCheckoutCompletedEvent(
  sessionOverrides: Partial<StripeCheckoutSession> & { metadata: StripeSessionMetadata },
): StripeWebhookEvent<StripeCheckoutSession> {
  return {
    id:       `evt_test_${Date.now()}`,
    object:   'event',
    type:     'checkout.session.completed',
    livemode: false,
    created:  Math.floor(Date.now() / 1000),
    data:     { object: makeCheckoutSession(sessionOverrides) },
  };
}

export function makeCheckoutExpiredEvent(
  sessionOverrides: Partial<StripeCheckoutSession> & { metadata: StripeSessionMetadata },
): StripeWebhookEvent<StripeCheckoutSession> {
  return {
    id:       `evt_test_${Date.now()}`,
    object:   'event',
    type:     'checkout.session.expired',
    livemode: false,
    created:  Math.floor(Date.now() / 1000),
    data:     {
      object: makeCheckoutSession({
        payment_status: 'unpaid',
        ...sessionOverrides,
      }),
    },
  };
}

export function makePaymentFailedEvent(
  sessionOverrides: Partial<StripeCheckoutSession> & { metadata: StripeSessionMetadata },
): StripeWebhookEvent<StripeCheckoutSession> {
  return {
    id:       `evt_test_${Date.now()}`,
    object:   'event',
    type:     'payment_intent.payment_failed',
    livemode: false,
    created:  Math.floor(Date.now() / 1000),
    data:     {
      object: makeCheckoutSession({
        payment_status: 'unpaid',
        ...sessionOverrides,
      }),
    },
  };
}

// ─── Common test payloads ──────────────────────────────────────────────────────

/** S01 — full payment for Villa Sunrise, 7 nights */
export const S01_CHECKOUT_COMPLETED = makeCheckoutCompletedEvent({
  metadata: {
    booking_id:   'b0000000-0000-8000-b000-000000000001',
    listing_id:   'a0000000-0000-7000-a000-000000000001',
    payment_type: 'full',
  },
  amount_total: 137500,
});

/** S09 — duplicate of S01 event (same id) — idempotency test */
export const S09_DUPLICATE_EVENT: StripeWebhookEvent<StripeCheckoutSession> = {
  ...S01_CHECKOUT_COMPLETED,
  // Same event id — should be detected as duplicate
};

/** S08 — deposit payment (50% of total) */
export const S08_DEPOSIT_COMPLETED = makeCheckoutCompletedEvent({
  metadata: {
    booking_id:   'b0000000-0000-8000-b000-000000000003',
    listing_id:   'a0000000-0000-7000-a000-000000000001',
    payment_type: 'deposit',
  },
  amount_total: 68750,  // 50% of 137500
});

/** S05 — expired session */
export const S05_SESSION_EXPIRED = makeCheckoutExpiredEvent({
  metadata: {
    booking_id:   'b0000000-0000-8000-b000-000000000004',
    listing_id:   'a0000000-0000-7000-a000-000000000001',
    payment_type: 'full',
  },
});
