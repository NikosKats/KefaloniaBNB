// tests/agents/GuestAgent.ts
// Scripted guest agent — browses listings, creates bookings.
// Stateless auth: guests interact without a login session.

import type { AgentState } from './types';
import { parseResponse } from './types';

export interface GuestProfile {
  name: string;
  email: string;
  phone?: string;
  country?: string;
}

export interface BookingParams {
  listingId: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  guests: number;
  paymentMethod?: 'stripe' | 'bank_transfer';
  paymentType?: 'full' | 'deposit';
  couponCode?: string;
}

export class GuestAgent {
  readonly role = 'guest' as const;
  state: AgentState = { lastAction: null, lastResult: null, errors: [] };

  constructor(
    private readonly profile: GuestProfile,
    private readonly baseUrl: string,
  ) {}

  // ── Listings ──────────────────────────────────────────────────────────────

  /** Fetch all public listings, optionally filtered */
  async browseListings(
    fetch: typeof globalThis.fetch,
    filters: { minGuests?: number; city?: string; checkIn?: string; checkOut?: string } = {},
  ): Promise<Array<{ id: string; slug: string; title: string; max_guests: number }>> {
    const params = new URLSearchParams();
    if (filters.minGuests) params.set('guests', String(filters.minGuests));
    if (filters.city)      params.set('city', filters.city);
    if (filters.checkIn)   params.set('check_in', filters.checkIn);
    if (filters.checkOut)  params.set('check_out', filters.checkOut);

    const res = await fetch(`${this.baseUrl}/api/listings?${params}`);
    const data = await parseResponse<Array<{ id: string; slug: string; title: string; max_guests: number }>>(res);

    this.state.lastAction = 'browse_listings';
    this.state.lastResult = data;
    return data;
  }

  /**
   * Decision rule: pick the first listing that fits the required guest count.
   * In a real test, override this with a specific listing id.
   */
  selectListing(
    listings: Array<{ id: string; slug: string; max_guests: number }>,
    requiredGuests: number,
  ): { id: string; slug: string } | null {
    return listings.find(l => l.max_guests >= requiredGuests) ?? null;
  }

  // ── Booking ───────────────────────────────────────────────────────────────

  /** Create a booking via Stripe card checkout */
  async initiateCardBooking(
    fetch: typeof globalThis.fetch,
    params: BookingParams,
  ): Promise<{ bookingId: string; checkoutUrl: string }> {
    const res = await fetch(`${this.baseUrl}/api/bookings/create`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id:     params.listingId,
        check_in:       params.checkIn,
        check_out:      params.checkOut,
        guests_adults:  params.guests,
        guest_name:     this.profile.name,
        guest_email:    this.profile.email,
        guest_phone:    this.profile.phone,
        guest_country:  this.profile.country,
        payment_method: 'stripe',
        payment_type:   params.paymentType ?? 'full',
        coupon_code:    params.couponCode,
      }),
    });

    const data = await parseResponse<{ bookingId: string; checkoutUrl: string }>(res);
    this.state.lastAction = 'create_booking_card';
    this.state.lastResult = data;
    return data;
  }

  /** Create a booking via bank transfer */
  async initiateBankTransferBooking(
    fetch: typeof globalThis.fetch,
    params: BookingParams,
  ): Promise<{ bookingId: string; paymentMethod: string }> {
    const res = await fetch(`${this.baseUrl}/api/bookings/create`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id:     params.listingId,
        check_in:       params.checkIn,
        check_out:      params.checkOut,
        guests_adults:  params.guests,
        guest_name:     this.profile.name,
        guest_email:    this.profile.email,
        guest_phone:    this.profile.phone,
        guest_country:  this.profile.country,
        payment_method: 'bank_transfer',
        payment_type:   'full',
        coupon_code:    params.couponCode,
      }),
    });

    const data = await parseResponse<{ bookingId: string; paymentMethod: string }>(res);
    this.state.lastAction = 'create_booking_bank';
    this.state.lastResult = data;
    return data;
  }

  /** Attempt a booking that should fail with a specific HTTP status */
  async attemptBooking(
    fetch: typeof globalThis.fetch,
    params: BookingParams,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}/api/bookings/create`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id:     params.listingId,
        check_in:       params.checkIn,
        check_out:      params.checkOut,
        guests_adults:  params.guests,
        guest_name:     this.profile.name,
        guest_email:    this.profile.email,
        payment_method: params.paymentMethod ?? 'stripe',
        payment_type:   params.paymentType ?? 'full',
      }),
    });
  }
}
