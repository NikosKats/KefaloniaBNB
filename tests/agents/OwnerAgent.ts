// tests/agents/OwnerAgent.ts
// Scripted owner agent — manages listings, bookings, and cleaning requests.

import type { AgentState } from './types';
import { parseResponse } from './types';

export class OwnerAgent {
  readonly role = 'property_owner' as const;
  state: AgentState = { lastAction: null, lastResult: null, errors: [] };
  private authCookie: string | null = null;

  constructor(
    private readonly owner: { email: string; password: string; id: string },
    private readonly baseUrl: string,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(fetch: typeof globalThis.fetch): Promise<void> {
    const body = new FormData();
    body.append('email', this.owner.email);
    body.append('password', this.owner.password);

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

  async getMyListings(fetch: typeof globalThis.fetch) {
    const res = await fetch(`${this.baseUrl}/api/owner/listings`, { headers: this.headers });
    return parseResponse<Array<{ id: string; title: string; is_active: boolean }>>(res);
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  async getMyBookings(fetch: typeof globalThis.fetch) {
    const res = await fetch(`${this.baseUrl}/api/owner/bookings`, { headers: this.headers });
    return parseResponse<Array<Record<string, unknown>>>(res);
  }

  async approveBankTransfer(fetch: typeof globalThis.fetch, bookingId: string) {
    const res = await fetch(`${this.baseUrl}/api/bookings/${bookingId}`, {
      method:  'PATCH',
      headers: this.headers,
      body:    JSON.stringify({ status: 'confirmed' }),
    });
    return parseResponse(res);
  }

  // ── Cleaning requests ─────────────────────────────────────────────────────

  async createCleaningRequest(
    fetch: typeof globalThis.fetch,
    params: {
      listingId: string;
      bookingId?: string;
      requestedDate: string;
      earliestTime?: string;
      latestTime?: string;
      cleaningType?: string;
      urgency?: string;
      propertySize?: number;
      notes?: string;
      checklistItems: string[];
      saveAsTemplate?: boolean;
      templateName?: string;
    },
  ): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/api/cleaning/requests`, {
      method:  'POST',
      headers: this.headers,
      body: JSON.stringify({
        listing_id:      params.listingId,
        booking_id:      params.bookingId,
        cleaning_type:   params.cleaningType ?? 'turnover',
        urgency:         params.urgency ?? 'normal',
        requested_date:  params.requestedDate,
        earliest_time:   params.earliestTime ?? '10:00',
        latest_time:     params.latestTime ?? '14:00',
        property_size:   params.propertySize,
        notes:           params.notes,
        checklist_items: params.checklistItems,
        save_as_template: params.saveAsTemplate ?? false,
        template_name:   params.templateName,
      }),
    });

    const data = await parseResponse<{ id: string }>(res);
    this.state.lastAction = 'create_cleaning_request';
    this.state.lastResult = data;
    return data;
  }

  async viewBids(
    fetch: typeof globalThis.fetch,
    requestId: string,
  ): Promise<Array<{ id: string; proposed_price: number; message: string | null; is_accepted: boolean | null }>> {
    const res = await fetch(
      `${this.baseUrl}/api/cleaning/requests/${requestId}/bids`,
      { headers: this.headers },
    );
    const data = await parseResponse<Array<{ id: string; proposed_price: number; message: string | null; is_accepted: boolean | null }>>(res);
    this.state.lastAction = 'view_bids';
    this.state.lastResult = data;
    return data;
  }

  /**
   * Decision rule: accept the lowest-priced bid that includes a message.
   * Falls back to lowest price overall if no bid has a message.
   */
  pickBestBid<T extends { id: string; proposed_price: number; message: string | null }>(bids: T[]): T {
    const withMessage = bids.filter(b => b.message);
    const pool = withMessage.length > 0 ? withMessage : bids;
    return pool.sort((a, b) => a.proposed_price - b.proposed_price)[0];
  }

  async acceptBid(
    fetch: typeof globalThis.fetch,
    requestId: string,
    matchId: string,
  ): Promise<{ jobId: string }> {
    const res = await fetch(
      `${this.baseUrl}/api/cleaning/requests/${requestId}/accept`,
      {
        method:  'POST',
        headers: this.headers,
        body:    JSON.stringify({ match_id: matchId }),
      },
    );
    const data = await parseResponse<{ jobId: string }>(res);
    this.state.lastAction = 'accept_bid';
    this.state.lastResult = data;
    return data;
  }

  async approveJob(fetch: typeof globalThis.fetch, jobId: string) {
    const res = await fetch(`${this.baseUrl}/api/cleaning/jobs/${jobId}`, {
      method:  'PATCH',
      headers: this.headers,
      body:    JSON.stringify({ status: 'approved' }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'approve_job';
    this.state.lastResult = data;
    return data;
  }

  async disputeJob(fetch: typeof globalThis.fetch, jobId: string, reason: string) {
    const res = await fetch(`${this.baseUrl}/api/cleaning/jobs/${jobId}/dispute`, {
      method:  'POST',
      headers: this.headers,
      body:    JSON.stringify({ reason }),
    });
    const data = await parseResponse(res);
    this.state.lastAction = 'dispute_job';
    this.state.lastResult = data;
    return data;
  }
}
