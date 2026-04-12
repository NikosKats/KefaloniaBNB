export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'super_admin' | 'property_owner' | 'restaurant_owner' | 'cleaner' | 'member';
  avatar_url: string | null;
  stripe_account_id: string | null;
  stripe_account_status: 'not_connected' | 'pending' | 'active' | 'restricted';
  stripe_onboarding_done: boolean;
  phone: string | null;
  bio: string | null;
  company_name: string | null;
  payment_account_name: string | null;
  payment_revolut:      string | null;
  payment_wise:         string | null;
  payment_iban:         string | null;
  payment_bic:          string | null;
  subscription_active:                  boolean;
  subscription_expires_at:              string | null;
  subscription_stripe_customer_id:      string | null;
  subscription_stripe_subscription_id:  string | null;
  commission_rate:                       number | null;
  friends_count: number;
  favorites_count: number;
  unread_messages_count: number;
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  property_type: 'villa' | 'cottage' | 'apartment' | 'house' | 'studio';
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  map_embed_url: string | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  base_price: number;
  cleaning_fee: number;
  extra_guest_fee: number;
  extra_guest_after: number;
  min_nights: number;
  max_nights: number | null;
  instant_booking: boolean;
  is_active: boolean;
  check_in_time: string;
  check_out_time: string;
  house_rules: string | null;
  checkin_instructions: string | null;
  deposit_percent: number | null;
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
  meta_title: string | null;
  meta_description: string | null;
  review_count: number;
  avg_rating: number;
  owner_id: string | null;
  commission_rate: number;
  telegram_channel_id: string | null;
  host_phone: string | null;
  host_whatsapp: boolean;
  host_viber: boolean;
  host_telegram: boolean;
  host_messaging_visible: boolean;
  allow_telegram_direct: boolean;
  offer_full_payment: boolean | null;
  google_place_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  storage_key: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface Amenity {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  category: 'general' | 'bathroom' | 'bedroom' | 'kitchen' | 'outdoor' | 'safety' | 'accessibility' | 'entertainment';
}

export interface ListingWithDetails extends Listing {
  listing_images: ListingImage[];
  amenities: Amenity[];
}

export interface Season {
  id: string;
  listing_id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_modifier: number;
  min_nights: number | null;
  created_at: string;
}

export interface BlockedDate {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  source: 'manual' | 'ical' | 'airbnb' | 'booking_com';
  external_uid: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_nights: number | null;
  min_total: number | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  listing_id: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  listing_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  check_in: string;
  check_out: string;
  nights: number;
  guests_adults: number;
  guests_children: number;
  guests_infants: number;
  guests_pets: number;
  base_price: number;
  base_total: number;
  cleaning_fee: number;
  extra_guest_fee: number;
  coupon_id: string | null;
  coupon_discount: number;
  taxes: number;
  total_price: number;
  currency: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_country: string | null;
  guest_message: string | null;
  payment_method: 'stripe' | 'bank_transfer' | 'telegram_direct';
  payment_type: 'full' | 'deposit';
  deposit_amount: number;
  remaining_amount: number;
  payment_status: 'unpaid' | 'deposit_paid' | 'paid' | 'refunded' | 'partially_refunded';
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  amount_paid: number;
  internal_notes: string | null;
  source: 'direct' | 'airbnb' | 'booking_com' | 'vrbo' | 'manual';
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  completed_at: string | null;
  telegram_message_id: number | null;
  platform_fee: number;
  owner_payout: number;
  payout_status: 'na' | 'pending' | 'transferred' | 'manual_paid';
  payout_transfer_id: string | null;
  payout_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithListing extends Booking {
  listings: Pick<Listing, 'title' | 'slug' | 'city' | 'check_in_time' | 'check_out_time'>;
}

export interface Review {
  id: string;
  listing_id: string;
  booking_id: string | null;
  guest_name: string;
  guest_country: string | null;
  rating: number;
  title: string | null;
  body: string;
  is_published: boolean;
  is_verified: boolean;
  source: 'direct' | 'airbnb' | 'google' | 'booking_com' | 'manual';
  stay_date: string | null;
  created_at: string;
}

export interface Inquiry {
  id: string;
  listing_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  status: 'new' | 'replied' | 'converted' | 'spam';
  created_at: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  page_type: 'faq' | 'policy' | 'area_guide' | 'custom';
  title: string;
  body: string | null;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FaqItem {
  id: string;
  page_id: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export interface PriceBreakdown {
  nights: number;
  basePrice: number;
  baseTotal: number;
  seasonModifier: number;
  cleaningFee: number;
  extraGuestFee: number;
  couponDiscount: number;
  taxes: number;
  total: number;
  currency: string;
}

export interface FeaturedListing {
  id: string;
  listing_id: string;
  owner_id: string | null;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface DateRange {
  start: string;
  end: string;
  type: 'booked' | 'blocked';
}
