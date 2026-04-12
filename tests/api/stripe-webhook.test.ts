/**
 * Unit tests for POST /api/stripe/webhook
 *
 * We mock:
 *   - constructWebhookEvent  (stripe lib)
 *   - getServiceClient       (supabase lib)
 *   - sendBookingConfirmed   (email lib)
 *   - sendDepositReceived    (email lib)
 *   - transferOwnerPayout    (stripe lib)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeStripeWebhookEvent } from '../mocks/stripe.mock.ts';

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockConstructWebhookEvent = vi.fn();
const mockTransferOwnerPayout   = vi.fn();

vi.mock('../../src/lib/stripe.ts', () => ({
  constructWebhookEvent: (...args: unknown[]) => mockConstructWebhookEvent(...args),
  transferOwnerPayout:   (...args: unknown[]) => mockTransferOwnerPayout(...args),
}));

const mockSendBookingConfirmed = vi.fn().mockResolvedValue(undefined);
const mockSendDepositReceived  = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/lib/email.ts', () => ({
  sendBookingConfirmed: (...args: unknown[]) => mockSendBookingConfirmed(...args),
  sendDepositReceived:  (...args: unknown[]) => mockSendDepositReceived(...args),
}));

const mockGetServiceClient = vi.fn();
vi.mock('../../src/lib/supabase.ts', () => ({
  getServiceClient: () => mockGetServiceClient(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BOOKING_ID = 'booking-uuid-1';
const LISTING_ID = 'listing-uuid-1';

function makeWebhookRequest(body = 'raw-body', sig = 'valid-sig'): Request {
  return new Request('https://kefaloniabnb.com/api/stripe/webhook', {
    method:  'POST',
    headers: { 'stripe-signature': sig },
    body,
  });
}

function makeListingData(overrides: Record<string, unknown> = {}) {
  return {
    id:              LISTING_ID,
    title:           'Villa Thalassa',
    owner_id:        'owner-uuid',
    commission_rate: 10,
    profiles: {
      stripe_account_id:      'acct_test_abc',
      stripe_onboarding_done: true,
    },
    ...overrides,
  };
}

function buildSuccessServiceClient(listingData: unknown = makeListingData()) {
  const bookingUpdateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id:              BOOKING_ID,
        listing_id:      LISTING_ID,
        currency:        'eur',
        listings: {
          title: 'Villa Thalassa',
          slug:  'villa-thalassa',
        },
      },
      error: null,
    }),
  };

  // Chain used for the "existing booking" fetch before confirming
  const bookingSelectChain = {
    eq:          vi.fn().mockReturnThis(),
    neq:         vi.fn().mockReturnThis(),
    lt:          vi.fn().mockReturnThis(),
    gt:          vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({
      data: { id: BOOKING_ID, status: 'pending', check_in: '2025-07-01', check_out: '2025-07-08', listing_id: LISTING_ID },
      error: null,
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // no conflict
  };

  const fromChain = (table: string) => {
    if (table === 'listings') {
      return {
        select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: listingData, error: null }) }) }),
      };
    }
    if (table === 'bookings') {
      return {
        select: () => bookingSelectChain,
        update: () => bookingUpdateChain,
      };
    }
    if (table === 'audit_logs') {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    }
    return { update: () => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) };
  };

  return { from: fromChain };
}

async function getHandler() {
  const mod = await import('../../src/pages/api/stripe/webhook.ts');
  return mod.POST;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServiceClient.mockReturnValue(buildSuccessServiceClient());
    mockTransferOwnerPayout.mockResolvedValue({ id: 'tr_test_abc' });
  });

  // ── Signature verification ───────────────────────────────────────────────────

  it('returns 400 when webhook signature verification fails', async () => {
    mockConstructWebhookEvent.mockRejectedValue(new Error('Invalid signature'));
    const handler = await getHandler();
    const res = await handler({ request: makeWebhookRequest('bad-body', 'bad-sig') } as any);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toMatch(/webhook error/i);
  });

  // ── checkout.session.completed — full payment ────────────────────────────────

  it('returns 200 for a valid checkout.session.completed event', async () => {
    const event = makeStripeWebhookEvent({
      type: 'checkout.session.completed',
      data: {
        metadata:       { booking_id: BOOKING_ID, listing_id: LISTING_ID, payment_type: 'full' },
        amount_total:   75000, // €750 in cents
        payment_intent: 'pi_test_abc',
      },
    });
    mockConstructWebhookEvent.mockResolvedValue(event);

    const handler = await getHandler();
    const res = await handler({ request: makeWebhookRequest() } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it('updates booking status to confirmed on full payment', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq:     vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: BOOKING_ID, listings: { title: 'Villa' }, currency: 'eur' },
        error: null,
      }),
    });

    const spyClient = {
      from: (table: string) => {
        if (table === 'bookings') return {
          select: () => ({
            eq:          vi.fn().mockReturnThis(),
            neq:         vi.fn().mockReturnThis(),
            lt:          vi.fn().mockReturnThis(),
            gt:          vi.fn().mockReturnThis(),
            limit:       vi.fn().mockReturnThis(),
            single:      vi.fn().mockResolvedValue({ data: { id: BOOKING_ID, status: 'pending', check_in: '2025-07-01', check_out: '2025-07-08', listing_id: LISTING_ID }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          update: updateSpy,
        };
        if (table === 'listings') {
          return {
            select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: makeListingData(), error: null }) }) }),
          };
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({}) };
        return {};
      },
    };
    mockGetServiceClient.mockReturnValue(spyClient);

    const event = makeStripeWebhookEvent({
      type: 'checkout.session.completed',
      data: {
        metadata:       { booking_id: BOOKING_ID, listing_id: LISTING_ID, payment_type: 'full' },
        amount_total:   75000,
        payment_intent: 'pi_abc',
      },
    });
    mockConstructWebhookEvent.mockResolvedValue(event);

    const handler = await getHandler();
    await handler({ request: makeWebhookRequest() } as any);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed', payment_status: 'paid' })
    );
  });

  // ── checkout.session.completed — deposit ─────────────────────────────────────

  it('marks payment_status as deposit_paid for deposit payment type', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq:     vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: BOOKING_ID, listings: { title: 'Villa' }, currency: 'eur' },
        error: null,
      }),
    });

    mockGetServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'bookings') return {
          select: () => ({
            eq:          vi.fn().mockReturnThis(),
            neq:         vi.fn().mockReturnThis(),
            lt:          vi.fn().mockReturnThis(),
            gt:          vi.fn().mockReturnThis(),
            limit:       vi.fn().mockReturnThis(),
            single:      vi.fn().mockResolvedValue({ data: { id: BOOKING_ID, status: 'pending', check_in: '2025-07-01', check_out: '2025-07-08', listing_id: LISTING_ID }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          update: updateSpy,
        };
        if (table === 'listings') {
          return {
            select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: makeListingData(), error: null }) }) }),
          };
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({}) };
        return {};
      },
    });

    const event = makeStripeWebhookEvent({
      type: 'checkout.session.completed',
      data: {
        metadata:     { booking_id: BOOKING_ID, listing_id: LISTING_ID, payment_type: 'deposit' },
        amount_total: 22500, // €225 deposit
      },
    });
    mockConstructWebhookEvent.mockResolvedValue(event);

    const handler = await getHandler();
    await handler({ request: makeWebhookRequest() } as any);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: 'deposit_paid' })
    );
  });

  // ── checkout.session.expired ──────────────────────────────────────────────────

  it('cancels pending booking when session expires', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
    });
    mockGetServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'bookings') return { update: updateSpy };
        return {};
      },
    });

    const event = {
      type: 'checkout.session.expired',
      data: { object: { metadata: { booking_id: BOOKING_ID } } },
    };
    mockConstructWebhookEvent.mockResolvedValue(event);

    const handler = await getHandler();
    const res = await handler({ request: makeWebhookRequest() } as any);
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    );
  });

  // ── payment_intent.payment_failed ─────────────────────────────────────────────

  it('marks payment_status unpaid when payment intent fails', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
    });
    mockGetServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'bookings') return { update: updateSpy };
        return {};
      },
    });

    const event = {
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_failed', metadata: { booking_id: BOOKING_ID } } },
    };
    mockConstructWebhookEvent.mockResolvedValue(event);

    const handler = await getHandler();
    const res = await handler({ request: makeWebhookRequest() } as any);
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({ payment_status: 'unpaid' });
  });

  // ── Unknown event type ────────────────────────────────────────────────────────

  it('returns 200 and does nothing for unrecognised event types', async () => {
    mockConstructWebhookEvent.mockResolvedValue({ type: 'customer.created', data: { object: {} } });
    const handler = await getHandler();
    const res = await handler({ request: makeWebhookRequest() } as any);
    expect(res.status).toBe(200);
  });

  // ── Missing booking_id in metadata ───────────────────────────────────────────

  it('returns 200 gracefully when booking_id is missing from metadata', async () => {
    const event = makeStripeWebhookEvent({
      type: 'checkout.session.completed',
      data: { metadata: {} }, // no booking_id
    });
    mockConstructWebhookEvent.mockResolvedValue(event);

    const handler = await getHandler();
    const res = await handler({ request: makeWebhookRequest() } as any);
    expect(res.status).toBe(200);
  });
});
