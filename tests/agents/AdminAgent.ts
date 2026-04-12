// tests/agents/AdminAgent.ts
// Scripted super_admin agent — activates listings, resolves disputes, manages platform.

import type { AgentState } from './types';
import { parseResponse } from './types';

export class AdminAgent {
  readonly role = 'super_admin' as const;
  state: AgentState = { lastAction: null, lastResult: null, errors: [] };
  private authCookie: string | null = null;

  constructor(
    private readonly admin: { email: string; password: string },
    private readonly baseUrl: string,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(fetch: typeof globalThis.fetch): Promise<void> {
    const body = new FormData();
    body.append('email', this.admin.email);
    body.append('password', this.admin.password);

    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method:   'POST',
      body,
      redirect: 'manual',
    });
    this.authCookie = res.headers.get('set-cookie');
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.authCookie ? { Cookie: this.authCookie } : {}),
    };
  }

  // ── Listings ──────────────────────────────────────────────────────────────

  async activateListing(fetch: typeof globalThis.fetch, listingId: string) {
    const res = await fetch(`${this.baseUrl}/api/admin/listings/${listingId}`, {
      method:  'PATCH',
      headers: this.headers,
      body:    JSON.stringify({ is_active: true }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'activate_listing';
    this.state.lastResult = data;
    return data;
  }

  async deactivateListing(fetch: typeof globalThis.fetch, listingId: string) {
    return fetch(`${this.baseUrl}/api/admin/listings/${listingId}`, {
      method:  'PATCH',
      headers: this.headers,
      body:    JSON.stringify({ is_active: false }),
    });
  }

  // ── Cleaners ──────────────────────────────────────────────────────────────

  async activateCleaner(fetch: typeof globalThis.fetch, cleanerId: string) {
    const res = await fetch(`${this.baseUrl}/api/admin/cleaners/${cleanerId}`, {
      method:  'PATCH',
      headers: this.headers,
      body:    JSON.stringify({ is_active: true }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'activate_cleaner';
    this.state.lastResult = data;
    return data;
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  async markBookingPaid(fetch: typeof globalThis.fetch, bookingId: string) {
    const res = await fetch(`${this.baseUrl}/api/bookings/${bookingId}`, {
      method:  'PATCH',
      headers: this.headers,
      body:    JSON.stringify({ payment_status: 'paid', status: 'confirmed' }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'mark_booking_paid';
    this.state.lastResult = data;
    return data;
  }

  async markPayoutManual(fetch: typeof globalThis.fetch, bookingId: string) {
    const res = await fetch(`${this.baseUrl}/api/bookings/${bookingId}`, {
      method:  'PATCH',
      headers: this.headers,
      body: JSON.stringify({
        payout_status: 'manual_paid',
        payout_at:     new Date().toISOString(),
      }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'mark_payout_manual';
    this.state.lastResult = data;
    return data;
  }

  // ── Cleaning ──────────────────────────────────────────────────────────────

  async approveStaleJob(fetch: typeof globalThis.fetch, jobId: string) {
    const res = await fetch(
      `${this.baseUrl}/api/admin/cleaning/jobs/${jobId}/approve`,
      { method: 'POST', headers: this.headers },
    );
    const data = await parseResponse(res);
    this.state.lastAction = 'approve_stale_job';
    this.state.lastResult = data;
    return data;
  }

  async resolveDispute(
    fetch: typeof globalThis.fetch,
    disputeId: string,
    resolution: { status: 'resolved' | 'escalated'; notes: string; overrideAmount?: number },
  ) {
    const res = await fetch(
      `${this.baseUrl}/api/admin/cleaning/disputes/${disputeId}`,
      {
        method:  'PATCH',
        headers: this.headers,
        body:    JSON.stringify(resolution),
      },
    );
    const data = await parseResponse(res);
    this.state.lastAction = 'resolve_dispute';
    this.state.lastResult = data;
    return data;
  }

  // ── Test mode ─────────────────────────────────────────────────────────────

  async enableTestMode(fetch: typeof globalThis.fetch, reason?: string) {
    const res = await fetch(`${this.baseUrl}/api/admin/test-mode`, {
      method:  'POST',
      headers: this.headers,
      body:    JSON.stringify({ enabled: true, reason }),
    });
    return parseResponse(res);
  }

  async disableTestMode(fetch: typeof globalThis.fetch) {
    const res = await fetch(`${this.baseUrl}/api/admin/test-mode`, {
      method:  'POST',
      headers: this.headers,
      body:    JSON.stringify({ enabled: false }),
    });
    return parseResponse(res);
  }

  // ── Stripe webhook simulation ─────────────────────────────────────────────

  async simulateStripeWebhook(
    fetch: typeof globalThis.fetch,
    payload: {
      type: 'checkout.session.completed' | 'checkout.session.expired' | 'payment_intent.payment_failed';
      bookingId: string;
      listingId?: string;
      amountTotal?: number;      // cents
      paymentType?: 'full' | 'deposit';
      paymentIntentId?: string;
    },
  ): Promise<Response> {
    const sessionData = {
      metadata: {
        booking_id:   payload.bookingId,
        listing_id:   payload.listingId,
        payment_type: payload.paymentType ?? 'full',
      },
      amount_total:   payload.amountTotal ?? 137500,
      payment_intent: payload.paymentIntentId ?? 'pi_test_sim',
    };

    const event = {
      type: payload.type,
      data: { object: sessionData },
    };

    // In E2E tests, use a test-mode Stripe signature bypass header
    return fetch(`${this.baseUrl}/api/stripe/webhook`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'stripe-signature': 'test_bypass_sig',
        ...this.headers,
      },
      body: JSON.stringify(event),
    });
  }
}
