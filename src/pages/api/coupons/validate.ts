import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { calculatePriceClient, calculateCouponDiscount } from '../../../lib/pricing.ts';
import type { Listing, Season } from '../../../types/index.ts';

export const GET: APIRoute = async ({ url }) => {
  const code       = url.searchParams.get('code')?.toUpperCase();
  const listingId  = url.searchParams.get('listing_id');
  const checkIn    = url.searchParams.get('check_in');
  const checkOut   = url.searchParams.get('check_out');
  const guests     = parseInt(url.searchParams.get('guests') ?? '2') || 2;

  if (!code) return new Response(JSON.stringify({ valid: false, message: 'No code provided' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const service = getServiceClient();

  const { data: coupon } = await service
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (!coupon) return new Response(JSON.stringify({ valid: false, message: 'Invalid or expired promo code' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return new Response(JSON.stringify({ valid: false, message: 'Code not yet active' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return new Response(JSON.stringify({ valid: false, message: 'Code has expired' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) return new Response(JSON.stringify({ valid: false, message: 'Code has reached its usage limit' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (coupon.listing_id && coupon.listing_id !== listingId) return new Response(JSON.stringify({ valid: false, message: 'Code not valid for this property' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  let discount = 0;
  let message = '';

  if (listingId && checkIn && checkOut) {
    const { data: listing } = await service.from('listings').select('*').eq('id', listingId).single();
    const { data: seasons } = await service.from('seasons').select('*').eq('listing_id', listingId);

    if (listing) {
      const price = calculatePriceClient(listing as Listing, checkIn, checkOut, guests, seasons as Season[] ?? []);
      discount = calculateCouponDiscount(coupon, price.baseTotal, price.extraGuestFee);
      message = coupon.discount_type === 'percent'
        ? `${coupon.discount_value}% discount applied — saving €${discount.toFixed(0)}`
        : `€${discount.toFixed(0)} discount applied`;
    }
  } else {
    message = coupon.discount_type === 'percent' ? `${coupon.discount_value}% discount` : `€${coupon.discount_value} off`;
  }

  return new Response(JSON.stringify({ valid: true, discount, message }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
