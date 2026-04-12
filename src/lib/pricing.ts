import type { Coupon, Listing, PriceBreakdown, Season } from '../types/index.ts';

export function calculatePriceClient(
  listing: Pick<Listing, 'base_price' | 'cleaning_fee' | 'extra_guest_fee' | 'extra_guest_after'>,
  checkIn: string,
  checkOut: string,
  guests: number,
  seasons: Season[] = [],
  couponDiscount = 0,
  currency = 'EUR'
): PriceBreakdown {
  const msPerDay = 1000 * 60 * 60 * 24;
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay
  );

  // Find applicable season
  const season = seasons.find(
    (s) => s.start_date <= checkIn && s.end_date >= checkOut
  );
  const seasonModifier = season?.price_modifier ?? 1.0;
  const basePrice = listing.base_price * seasonModifier;
  const baseTotal = basePrice * nights;

  const extraGuests = Math.max(0, guests - listing.extra_guest_after);
  const extraGuestFee = listing.extra_guest_fee * extraGuests * nights;

  const total = baseTotal + listing.cleaning_fee + extraGuestFee - couponDiscount;

  return {
    nights,
    basePrice,
    baseTotal,
    seasonModifier,
    cleaningFee: listing.cleaning_fee,
    extraGuestFee,
    couponDiscount,
    taxes: 0,
    total: Math.max(0, total),
    currency,
  };
}

/**
 * Calculates the discount amount for a coupon given a price breakdown.
 * Centralises the percent-vs-fixed logic that was duplicated across
 * bookings/create, coupons/validate, and book/[listingId].
 */
export function calculateCouponDiscount(
  coupon: Pick<Coupon, 'discount_type' | 'discount_value'>,
  baseTotal: number,
  extraGuestFee: number,
): number {
  if (coupon.discount_type === 'percent') {
    return Math.round((baseTotal + extraGuestFee) * coupon.discount_value) / 100;
  }
  return Math.min(coupon.discount_value, baseTotal);
}

export function formatPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCancellationDescription(policy: Listing['cancellation_policy']): string {
  switch (policy) {
    case 'flexible':
      return 'Full refund if cancelled 30+ days before check-in. 50% refund within 14–30 days. No refund within 14 days.';
    case 'moderate':
      return 'Full refund if cancelled 30+ days before check-in. 50% refund within 14–30 days. No refund within 14 days.';
    case 'strict':
      return 'Full refund within 48h of booking. 50% refund if cancelled 30+ days before check-in. No refund within 30 days.';
  }
}
