// Domain types for the Cleaning Marketplace module

export type CleaningRequestStatus = 'open' | 'matched' | 'confirmed' | 'cancelled';
export type CleaningType = 'turnover' | 'deep_clean' | 'linen_change' | 'inspection';
export type CleaningUrgency = 'normal' | 'urgent';
export type CleaningJobStatus = 'scheduled' | 'started' | 'completed' | 'approved' | 'disputed' | 'cancelled';
export type CleaningPaymentStatus = 'pending' | 'paid' | 'refunded';
export type CleaningPayoutStatus = 'pending' | 'transferred' | 'failed';
export type CleaningDisputeStatus = 'open' | 'resolved' | 'escalated';

export interface CleanerProfile {
  id: string;
  user_id: string;
  bio: string | null;
  languages: string[];
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  is_active: boolean;
  rating: number | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface CleanerService {
  id: string;
  cleaner_id: string;
  property_type: string;
  bedrooms_min: number;
  bedrooms_max: number;
  base_price: number;
  duration_hours: number;
  created_at: string;
  updated_at: string;
}

export interface CleanerServiceArea {
  id: string;
  cleaner_id: string;
  region: string;
  city: string | null;
}

export interface CleanerAvailability {
  id: string;
  cleaner_id: string;
  date: string;
  is_available: boolean;
}

export interface CleaningRequest {
  id: string;
  listing_id: string;
  owner_id: string;
  booking_id: string | null;
  requested_date: string;
  earliest_time: string;
  latest_time: string;
  notes: string | null;
  cleaning_type: CleaningType;
  urgency: CleaningUrgency;
  property_size: number | null;
  checklist_items: string[] | null;
  status: CleaningRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface CleaningChecklistTemplate {
  id: string;
  owner_id: string;
  listing_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CleaningChecklistTemplateItem {
  id: string;
  template_id: string;
  label: string;
  sort_order: number;
}

export interface CleaningMatch {
  id: string;
  request_id: string;
  cleaner_id: string;
  proposed_price: number;
  proposed_time: string | null;
  message: string | null;
  is_accepted: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CleaningJob {
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
  started_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobChecklistItem {
  id: string;
  job_id: string;
  label: string;
  is_done: boolean;
  sort_order: number;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  url: string;
  phase: 'before' | 'after';
  created_at: string;
}

export interface CleaningPayment {
  id: string;
  job_id: string;
  stripe_payment_intent: string | null;
  stripe_checkout_session: string | null;
  amount: number;
  currency: string;
  status: CleaningPaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CleaningPayout {
  id: string;
  job_id: string;
  cleaner_id: string;
  stripe_transfer_id: string | null;
  amount: number;
  currency: string;
  status: CleaningPayoutStatus;
  transferred_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CleaningReview {
  id: string;
  job_id: string;
  reviewer_id: string;
  cleaner_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface CleaningDispute {
  id: string;
  job_id: string;
  raised_by: string;
  reason: string;
  status: CleaningDisputeStatus;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CleaningNotification {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// Platform fee percentage (10%)
export const PLATFORM_FEE_PERCENT = 0.10;

export function computeFees(agreedPrice: number): { platformFee: number; cleanerPayout: number } {
  const platformFee = Math.round(agreedPrice * PLATFORM_FEE_PERCENT * 100) / 100;
  const cleanerPayout = Math.round((agreedPrice - platformFee) * 100) / 100;
  return { platformFee, cleanerPayout };
}
