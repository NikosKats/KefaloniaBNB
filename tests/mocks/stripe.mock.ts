import { vi } from 'vitest';

/**
 * Lightweight Stripe SDK mock. Import this and vi.mock the stripe lib module
 * so API calls never hit Stripe servers during tests.
 *
 * Usage:
 *   vi.mock('../../src/lib/stripe.ts', () => stripeModuleMock)
 */

export const mockCreateCheckoutSession = vi.fn();
export const mockConstructWebhookEvent = vi.fn();
export const mockCreateTransfer        = vi.fn();
export const mockCreateAccount         = vi.fn();
export const mockCreateAccountLink     = vi.fn();
export const mockRetrieveAccount       = vi.fn();
export const mockDeleteAccount         = vi.fn();

/** Default successful Stripe Checkout Session */
export const fakeCheckoutSession = {
  id:          'cs_test_abc123',
  url:         'https://checkout.stripe.com/pay/cs_test_abc123',
  payment_status: 'unpaid',
  metadata:    { booking_id: 'booking-uuid', payment_type: 'full' },
  amount_total: 75000,
  currency:    'eur',
};

/** Default successful Stripe webhook event (checkout.session.completed) */
export function makeStripeWebhookEvent(overrides: Partial<{
  type: string;
  data: Record<string, unknown>;
}> = {}) {
  return {
    id:      'evt_test_xyz',
    type:    overrides.type ?? 'checkout.session.completed',
    data: {
      object: {
        ...fakeCheckoutSession,
        payment_status: 'paid',
        ...(overrides.data ?? {}),
      },
    },
    livemode: false,
    created:  Math.floor(Date.now() / 1000),
  };
}

/** Pre-wired mock module to use with vi.mock */
export const stripeModuleMock = {
  getStripe: vi.fn(),
  createCheckoutSession:  mockCreateCheckoutSession,
  constructWebhookEvent:  mockConstructWebhookEvent,
  transferOwnerPayout:    mockCreateTransfer,
  createConnectAccount:   mockCreateAccount,
  createAccountLink:      mockCreateAccountLink,
  getConnectAccount:      mockRetrieveAccount,
  disconnectConnectAccount: mockDeleteAccount,
};

export function resetStripeMocks() {
  vi.clearAllMocks();
  mockCreateCheckoutSession.mockResolvedValue(fakeCheckoutSession);
  mockConstructWebhookEvent.mockResolvedValue(makeStripeWebhookEvent());
  mockCreateTransfer.mockResolvedValue({ id: 'tr_test_abc' });
  mockCreateAccount.mockResolvedValue({ id: 'acct_test_abc' });
  mockCreateAccountLink.mockResolvedValue({ url: 'https://connect.stripe.com/setup/test' });
  mockRetrieveAccount.mockResolvedValue({ id: 'acct_test_abc', charges_enabled: true });
  mockDeleteAccount.mockResolvedValue({ deleted: true });
}
