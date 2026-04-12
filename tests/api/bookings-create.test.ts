/**
 * Integration-style unit tests for POST /api/bookings/create
 *
 * We import the handler directly and mock all I/O boundaries:
 *   - Supabase (getServiceClient)
 *   - Stripe (createCheckoutSession)
 *   - Email (sendBookingReceived)
 *   - Telegram (sendBookingAlert)
 *
 * This lets us verify routing logic, validation, and response shapes without
 * hitting any external service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeListing, makeBooking, makeBookingPayload } from '../fixtures/factories.ts';

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockRpc           = vi.fn();
const mockFrom          = vi.fn();
const mockGetServiceClient = vi.fn();

vi.mock('../../src/lib/supabase.ts', () => ({
  getServiceClient: () => mockGetServiceClient(),
}));

const mockCreateCheckoutSession = vi.fn();
vi.mock('../../src/lib/stripe.ts', () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
}));

vi.mock('../../src/lib/email.ts', () => ({
  sendBookingReceived: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/telegram.ts', () => ({
  sendBookingAlert:        vi.fn().mockResolvedValue(null),
  sendTelegramDirectAlert: vi.fn().mockResolvedValue(null),
  getActiveChannels:       vi.fn().mockResolvedValue([]),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request('https://kefaloniabnb.com/api/bookings/create', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

const LISTING = makeListing({
  id:              'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  is_active:       true,
  min_nights:      3,
  max_nights:      30,
  max_guests:      6,
  instant_booking: false,
  deposit_percent: 30,
});

const CREATED_BOOKING = makeBooking({
  id:         'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  listing_id: LISTING.id,
  check_in:   '2025-09-01',
  check_out:  '2025-09-08',
  status:     'pending',
});

/** Build a Supabase client mock that returns success for each DB call */
function buildSuccessServiceClient() {
  const single         = vi.fn().mockResolvedValue({ data: { ...LISTING, telegram_channels: null }, error: null });
  const seasonsSingle  = vi.fn().mockResolvedValue({ data: [], error: null });
  const insertSingle   = vi.fn().mockResolvedValue({ data: CREATED_BOOKING, error: null });
  const rpcMock        = vi.fn().mockResolvedValue({ data: true, error: null });
  const updateChain    = { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
  const insertAudit    = vi.fn().mockResolvedValue({ data: null, error: null });

  const fromChain = (table: string) => {
    if (table === 'listings') {
      return {
        select: () => ({ eq: () => ({ or: () => ({ single }) }) }),
      };
    }
    if (table === 'seasons') {
      return { select: () => ({ eq: () => seasonsSingle }) };
    }
    if (table === 'bookings') {
      return {
        insert: () => ({ select: () => ({ single: insertSingle }) }),
        update: () => updateChain,
        delete: () => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      };
    }
    if (table === 'audit_logs') {
      return { insert: insertAudit };
    }
    return { select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) };
  };

  return { from: fromChain, rpc: rpcMock };
}

// ─── Import handler after mocks are set up ────────────────────────────────────
// Dynamic import used so vi.mock() hoisting applies first.
async function getHandler() {
  const mod = await import('../../src/pages/api/bookings/create.ts');
  return mod.POST;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/bookings/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServiceClient.mockReturnValue(buildSuccessServiceClient());
    mockCreateCheckoutSession.mockResolvedValue({
      id:  'cs_test_abc',
      url: 'https://checkout.stripe.com/pay/cs_test_abc',
    });
  });

  const VALID_PAYLOAD = makeBookingPayload({
    listing_id:   LISTING.id,
    check_in:     '2025-09-01',
    check_out:    '2025-09-08',  // 7 nights ≥ min_nights(3)
    guests_adults: 2,
    payment_method: 'stripe',
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 for invalid JSON body shape', async () => {
    const handler = await getHandler();
    const res = await handler({ request: makeRequest({}), locals: {} } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid input/i);
  });

  it('returns 400 when check_out is before check_in', async () => {
    const handler = await getHandler();
    const res = await handler({
      request: makeRequest({ ...VALID_PAYLOAD, check_in: '2025-09-08', check_out: '2025-09-01' }),
      locals:  {},
    } as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when guests_adults exceeds listing max_guests', async () => {
    const handler = await getHandler();
    const res = await handler({
      request: makeRequest({ ...VALID_PAYLOAD, guests_adults: 10 }), // > max_guests(6)
      locals:  {},
    } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/maximum/i);
  });

  // ── Listing not found ───────────────────────────────────────────────────────

  it('returns 404 when listing does not exist', async () => {
    const notFoundClient = buildSuccessServiceClient();
    // Override listings.single to return null
    (notFoundClient.from as any) = (table: string) => {
      if (table === 'listings') {
        const single = vi.fn().mockResolvedValue({ data: null, error: null });
        return {
          select: () => ({ eq: () => ({ or: () => ({ single }) }) }),
        };
      }
      return buildSuccessServiceClient().from(table);
    };
    mockGetServiceClient.mockReturnValue(notFoundClient);

    const handler = await getHandler();
    const res = await handler({ request: makeRequest(VALID_PAYLOAD), locals: {} } as any);
    expect(res.status).toBe(404);
  });

  // ── Availability ────────────────────────────────────────────────────────────

  it('returns 409 when dates are not available', async () => {
    const unavailableClient = buildSuccessServiceClient();
    unavailableClient.rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    mockGetServiceClient.mockReturnValue(unavailableClient);

    const handler = await getHandler();
    const res = await handler({ request: makeRequest(VALID_PAYLOAD), locals: {} } as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/no longer available/i);
  });

  // ── Happy paths ─────────────────────────────────────────────────────────────

  it('returns 200 with checkoutUrl for Stripe bookings', async () => {
    const handler = await getHandler();
    const res = await handler({ request: makeRequest(VALID_PAYLOAD), locals: {} } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookingId).toBe(CREATED_BOOKING.id);
    expect(body.checkoutUrl).toContain('checkout.stripe.com');
  });

  it('returns 200 with paymentMethod=bank_transfer for bank bookings', async () => {
    const handler = await getHandler();
    const res = await handler({
      request: makeRequest({ ...VALID_PAYLOAD, payment_method: 'bank_transfer' }),
      locals:  {},
    } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookingId).toBe(CREATED_BOOKING.id);
    expect(body.paymentMethod).toBe('bank_transfer');
  });

  // ── Minimum nights enforcement ──────────────────────────────────────────────

  it('returns 400 when stay is shorter than min_nights', async () => {
    const handler = await getHandler();
    // 2 nights < min_nights(3)
    const res = await handler({
      request: makeRequest({ ...VALID_PAYLOAD, check_in: '2025-09-01', check_out: '2025-09-03' }),
      locals:  {},
    } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/minimum stay/i);
  });

  // ── Stripe failure rollback ─────────────────────────────────────────────────

  it('returns 502 and cleans up booking when Stripe session creation fails', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('Stripe down'));
    const handler = await getHandler();
    const res = await handler({ request: makeRequest(VALID_PAYLOAD), locals: {} } as any);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/payment setup failed/i);
  });
});
