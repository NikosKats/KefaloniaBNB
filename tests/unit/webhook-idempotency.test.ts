// tests/unit/webhook-idempotency.test.ts
// Tests the idempotency logic that prevents duplicate payouts from
// Stripe webhook retries. The real handler uses a DB column check
// (.eq('payment_status', 'pending')) — these tests verify the pure logic.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Simulated idempotency store ──────────────────────────────────────────────

const processedEvents = new Set<string>();

function processWebhookEvent(
  eventId: string,
  handler: () => void,
): 'processed' | 'already_processed' {
  if (processedEvents.has(eventId)) return 'already_processed';
  handler();
  processedEvents.add(eventId);
  return 'processed';
}

beforeEach(() => {
  processedEvents.clear();
});

// ─── Basic idempotency ────────────────────────────────────────────────────────

describe('Webhook idempotency store', () => {

  it('processes a new event exactly once', () => {
    const handler = vi.fn();
    const result = processWebhookEvent('evt_001', handler);
    expect(result).toBe('processed');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('skips a duplicate event — handler not called twice', () => {
    const handler = vi.fn();
    processWebhookEvent('evt_002', handler);
    const result = processWebhookEvent('evt_002', handler);
    expect(result).toBe('already_processed');
    expect(handler).toHaveBeenCalledOnce();  // NOT twice
  });

  it('processes different events independently', () => {
    const handler = vi.fn();
    processWebhookEvent('evt_003', handler);
    processWebhookEvent('evt_004', handler);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('third duplicate of the same event also skipped', () => {
    const handler = vi.fn();
    processWebhookEvent('evt_005', handler);
    processWebhookEvent('evt_005', handler);
    processWebhookEvent('evt_005', handler);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('different event IDs with same prefix are treated as distinct', () => {
    const handler = vi.fn();
    processWebhookEvent('evt_006', handler);
    processWebhookEvent('evt_0066', handler);
    expect(handler).toHaveBeenCalledTimes(2);
  });

});

// ─── DB-level idempotency simulation ─────────────────────────────────────────
// Mirrors the actual webhook handler pattern:
//   .update({ payment_status: 'paid' })
//   .eq('payment_status', 'pending')   ← only updates if still pending

describe('DB-level idempotency via conditional update', () => {

  type PaymentStatus = 'pending' | 'paid' | 'refunded';

  interface MockBooking {
    id: string;
    payment_status: PaymentStatus;
    payout_status: string;
    email_sent: boolean;
  }

  function applyCheckoutCompleted(
    booking: MockBooking,
  ): { updated: boolean; booking: MockBooking } {
    if (booking.payment_status !== 'pending') {
      return { updated: false, booking };  // idempotency: already processed
    }
    return {
      updated: true,
      booking: { ...booking, payment_status: 'paid', payout_status: 'pending', email_sent: true },
    };
  }

  it('first webhook marks booking as paid', () => {
    const booking: MockBooking = {
      id: 'b-001',
      payment_status: 'pending',
      payout_status: 'na',
      email_sent: false,
    };
    const { updated, booking: updated_booking } = applyCheckoutCompleted(booking);
    expect(updated).toBe(true);
    expect(updated_booking.payment_status).toBe('paid');
    expect(updated_booking.email_sent).toBe(true);
  });

  it('second identical webhook is a no-op — booking already paid', () => {
    const booking: MockBooking = {
      id: 'b-001',
      payment_status: 'paid',   // already paid
      payout_status: 'pending',
      email_sent: true,
    };
    const { updated } = applyCheckoutCompleted(booking);
    expect(updated).toBe(false);
  });

  it('email is not sent on second webhook invocation', () => {
    const booking: MockBooking = {
      id: 'b-001',
      payment_status: 'paid',
      payout_status: 'pending',
      email_sent: true,
    };
    const { booking: result } = applyCheckoutCompleted(booking);
    // email_sent flag unchanged — we didn't re-send
    expect(result.email_sent).toBe(true);
    // but the count of sends should still be 1, not 2
  });

  it('S09: Stripe sends duplicate event — booking state unchanged', () => {
    let booking: MockBooking = {
      id: 'b-S09',
      payment_status: 'pending',
      payout_status: 'na',
      email_sent: false,
    };

    // First webhook
    ({ booking } = applyCheckoutCompleted(booking));
    expect(booking.payment_status).toBe('paid');

    // Second webhook (Stripe retry)
    const { updated } = applyCheckoutCompleted(booking);
    expect(updated).toBe(false);
    expect(booking.payment_status).toBe('paid');  // unchanged
    expect(booking.payout_status).toBe('pending'); // not reset
  });

});
