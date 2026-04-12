import { z } from 'zod';

export const CreateBookingSchema = z.object({
  listing_id:       z.string().uuid(),
  check_in:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests_adults:    z.number().int().min(1).max(20),
  guests_children:  z.number().int().min(0).max(10).default(0),
  guests_infants:   z.number().int().min(0).max(5).default(0),
  guests_pets:      z.number().int().min(0).max(5).default(0),
  guest_name:       z.string().min(2).max(100),
  guest_email:      z.string().email(),
  guest_phone:      z.string().max(30).optional(),
  guest_country:    z.string().max(60).optional(),
  guest_message:    z.string().max(1000).optional(),
  coupon_code:      z.string().max(30).optional(),
  payment_method:   z.enum(['stripe', 'bank_transfer', 'telegram_direct']).default('stripe'),
  payment_type:     z.enum(['full', 'deposit']).default('full'),
}).refine((d) => d.check_in < d.check_out, {
  message: 'check_out must be after check_in',
  path: ['check_out'],
});

export const InquirySchema = z.object({
  listing_id:  z.string().uuid().optional(),
  name:        z.string().min(2).max(100),
  email:       z.string().email(),
  phone:       z.string().max(30).optional(),
  message:     z.string().min(2).max(2000),
  check_in:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  check_out:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests:      z.number().int().min(1).max(30).optional(),
});

export const BlockDatesSchema = z.object({
  listing_id:  z.string().uuid(),
  start_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason:      z.string().max(200).optional(),
}).refine((d) => d.end_date >= d.start_date, {
  message: 'end_date must be on or after start_date',
  path: ['end_date'],
});

export const UpdateBookingSchema = z.object({
  status:         z.enum(['pending','awaiting_payment','confirmed','cancelled','completed','no_show']).optional(),
  payment_status: z.enum(['unpaid','deposit_paid','paid','refunded','partially_refunded']).optional(),
  internal_notes: z.string().max(2000).optional(),
  cancel_reason:  z.string().max(500).optional(),
  payout_status:  z.enum(['na','pending','transferred','manual_paid']).optional(),
  payout_at:      z.string().optional(),
  deposit_amount: z.number().positive().optional(),
});

export const ListingSchema = z.object({
  slug:              z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  title:             z.string().min(3).max(200),
  tagline:           z.string().max(200).optional(),
  description:       z.string().max(10000).optional(),
  property_type:     z.enum(['villa','cottage','apartment','house','studio']),
  address:           z.string().max(200).optional(),
  city:              z.string().max(100).optional(),
  region:            z.string().max(100).optional(),
  country:           z.string().max(100).default('Greece'),
  latitude:          z.number().min(-90).max(90).optional(),
  longitude:         z.number().min(-180).max(180).optional(),
  max_guests:        z.number().int().min(1).max(50),
  bedrooms:          z.number().int().min(0).max(30),
  beds:              z.number().int().min(1).max(50),
  bathrooms:         z.number().min(0.5).max(20),
  base_price:        z.number().positive(),
  cleaning_fee:      z.number().min(0).default(0),
  extra_guest_fee:   z.number().min(0).default(0),
  extra_guest_after: z.number().int().min(1).default(2),
  min_nights:        z.number().int().min(1).default(1),
  max_nights:        z.number().int().min(1).optional(),
  instant_booking:   z.boolean().default(false),
  is_active:         z.boolean().default(true),
  is_private:        z.boolean().default(false),
  check_in_time:     z.string().regex(/^\d{2}:\d{2}$/).default('15:00'),
  check_out_time:    z.string().regex(/^\d{2}:\d{2}$/).default('11:00'),
  house_rules:            z.string().max(5000).optional(),
  checkin_instructions:   z.string().max(3000).optional(),
  cancellation_policy: z.enum(['flexible','moderate','strict']).default('moderate'),
  meta_title:        z.string().max(160).optional(),
  meta_description:  z.string().max(300).optional(),
  telegram_channel_id: z.string().uuid().nullable().optional(),
  deposit_percent:     z.number().int().min(0).max(100).optional(),
  offer_full_payment:  z.boolean().optional(),
  area:                z.string().max(100).optional(),
  location_tags:       z.array(z.string().max(50)).optional(),
  host_phone:          z.string().max(30).optional(),
  host_whatsapp:       z.boolean().optional(),
  host_viber:          z.boolean().optional(),
  host_telegram:       z.boolean().optional(),
  host_messaging_visible: z.boolean().optional(),
  allow_telegram_direct:  z.boolean().optional(),
  offer_bank_transfer:    z.boolean().optional(),
  approved_at:            z.string().datetime().nullable().optional(),
});

export const CouponSchema = z.object({
  code:           z.string().min(3).max(30).toUpperCase(),
  description:    z.string().max(200).optional(),
  discount_type:  z.enum(['percent','fixed']),
  discount_value: z.number().positive(),
  min_nights:     z.number().int().min(1).optional(),
  min_total:      z.number().positive().optional(),
  max_uses:       z.number().int().min(1).optional(),
  valid_from:     z.string().optional(),
  valid_until:    z.string().optional(),
  is_active:      z.boolean().default(true),
  listing_id:     z.string().uuid().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type InquiryInput        = z.infer<typeof InquirySchema>;
export type BlockDatesInput     = z.infer<typeof BlockDatesSchema>;
export type UpdateBookingInput  = z.infer<typeof UpdateBookingSchema>;
export type ListingInput        = z.infer<typeof ListingSchema>;
export type CouponInput         = z.infer<typeof CouponSchema>;
