// tests/types/domain.ts
// Shared domain types used across all test layers

export type Role = 'guest' | 'property_owner' | 'cleaner' | 'admin' | 'super_admin';

export type BookingPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type BookingPayoutStatus  = 'na' | 'pending' | 'transferred' | 'manual_paid';
export type BookingStatus        = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type ListingStatus  = 'pending' | 'active' | 'inactive';
export type PropertyType   = 'villa' | 'apartment' | 'studio' | 'house';

export type CleaningType          = 'turnover' | 'deep_clean' | 'linen_change' | 'inspection';
export type CleaningUrgency       = 'normal' | 'urgent';
export type CleaningRequestStatus = 'open' | 'matched' | 'confirmed' | 'cancelled';
export type CleaningJobStatus     = 'scheduled' | 'started' | 'completed' | 'approved' | 'disputed' | 'cancelled';
export type CleaningPaymentStatus = 'pending' | 'paid' | 'refunded';
export type CleaningPayoutStatus  = 'pending' | 'transferred' | 'failed';
export type DisputeStatus         = 'open' | 'resolved' | 'escalated';
export type StripeEnvironment     = 'live' | 'test';

// ─── Users ────────────────────────────────────────────────────────────────────

export interface TestUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: Role;
  stripe_account_id?: string | null;
  stripe_onboarding_done?: boolean;
  admin_test_mode?: boolean;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export interface TestListing {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  city: string;
  property_type: PropertyType;
  bedrooms: number;
  max_guests: number;
  price_per_night: number;
  cleaning_fee: number;
  min_nights?: number;
  is_active: boolean;
  is_test: boolean;
  amenities: string[];
  lat?: number;
  lng?: number;
  description?: string;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface TestBooking {
  id: string;
  listing_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;   // YYYY-MM-DD
  check_out: string;  // YYYY-MM-DD
  nights: number;
  guests: number;
  total_price: number;
  cleaning_fee: number;
  platform_fee: number;
  owner_payout: number;
  payment_status: BookingPaymentStatus;
  payout_status: BookingPayoutStatus;
  stripe_checkout_session?: string | null;
  stripe_environment: StripeEnvironment;
  is_test: boolean;
}

// ─── Cleaning ─────────────────────────────────────────────────────────────────

export interface TestCleaningRequest {
  id: string;
  listing_id: string;
  owner_id: string;
  booking_id?: string;
  cleaning_type: CleaningType;
  urgency: CleaningUrgency;
  requested_date: string;
  earliest_time: string;
  latest_time: string;
  property_size?: number;
  notes?: string;
  checklist_items: string[];
  status: CleaningRequestStatus;
  is_test: boolean;
}

export interface TestBid {
  id: string;
  request_id: string;
  cleaner_id: string;
  proposed_price: number;
  proposed_time?: string;
  message?: string | null;
  is_accepted: boolean | null;
}

export interface TestCleaningJob {
  id: string;
  match_id: string;
  request_id: string;
  cleaner_id: string;
  listing_id: string;
  owner_id: string;
  scheduled_date: string;
  scheduled_time: string;
  agreed_price: number;
  platform_fee: number;
  cleaner_payout: number;
  status: CleaningJobStatus;
  started_at?: string;
  completed_at?: string;
  approved_at?: string;
  is_test: boolean;
  stripe_environment: StripeEnvironment;
}

export interface TestChecklistItem {
  id: string;
  job_id: string;
  label: string;
  is_done: boolean;
  sort_order: number;
}

export interface TestPhoto {
  id: string;
  job_id: string;
  url: string;
  phase: 'before' | 'after';
}

export interface TestDispute {
  id: string;
  job_id: string;
  raised_by: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
}

export interface TestNotification {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
}

// ─── Financial ────────────────────────────────────────────────────────────────

export interface BookingFinancials {
  nights: number;
  pricePerNight: number;
  cleaningFee: number;
  grossBookingAmount: number;
  totalCharged: number;
  platformFeeRate: number;
  platformFee: number;
  ownerPayout: number;
}

export interface CleaningFinancials {
  agreedPrice: number;
  platformFeeRate: number;
  platformFee: number;
  cleanerPayout: number;
}
