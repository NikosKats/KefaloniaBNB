import { describe, it, expect } from 'vitest';
import {
  CreateBookingSchema,
  InquirySchema,
  BlockDatesSchema,
  UpdateBookingSchema,
  ListingSchema,
  CouponSchema,
} from '../../src/lib/validators.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function firstError(result: { success: false; error: { issues: { message: string }[] } }): string {
  return result.error.issues[0].message;
}

// ─── CreateBookingSchema ───────────────────────────────────────────────────────
describe('CreateBookingSchema', () => {
  const BASE = {
    listing_id:    VALID_UUID,
    check_in:      '2025-09-01',
    check_out:     '2025-09-08',
    guests_adults: 2,
    guest_name:    'Alice Smith',
    guest_email:   'alice@example.com',
    payment_method: 'stripe',
    payment_type:   'full',
  };

  it('accepts a valid payload', () => {
    expect(CreateBookingSchema.safeParse(BASE).success).toBe(true);
  });

  it('defaults guests_children/infants/pets to 0', () => {
    const result = CreateBookingSchema.safeParse(BASE);
    if (!result.success) throw result.error;
    expect(result.data.guests_children).toBe(0);
    expect(result.data.guests_infants).toBe(0);
    expect(result.data.guests_pets).toBe(0);
  });

  it('defaults payment_method to stripe', () => {
    const { payment_method: _, ...rest } = BASE;
    const result = CreateBookingSchema.safeParse(rest);
    if (!result.success) throw result.error;
    expect(result.data.payment_method).toBe('stripe');
  });

  it('defaults payment_type to full', () => {
    const { payment_type: _, ...rest } = BASE;
    const result = CreateBookingSchema.safeParse(rest);
    if (!result.success) throw result.error;
    expect(result.data.payment_type).toBe('full');
  });

  it('rejects invalid listing_id (not UUID)', () => {
    const result = CreateBookingSchema.safeParse({ ...BASE, listing_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects check_in with wrong format', () => {
    const result = CreateBookingSchema.safeParse({ ...BASE, check_in: '01/09/2025' });
    expect(result.success).toBe(false);
  });

  it('rejects check_out <= check_in (cross-field refine)', () => {
    const result = CreateBookingSchema.safeParse({ ...BASE, check_out: '2025-09-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('check_out'))).toBe(true);
    }
  });

  it('rejects guests_adults = 0', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, guests_adults: 0 }).success).toBe(false);
  });

  it('rejects guests_adults > 20', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, guests_adults: 21 }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, guest_email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects guest_name < 2 chars', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, guest_name: 'A' }).success).toBe(false);
  });

  it('rejects invalid payment_method', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, payment_method: 'paypal' }).success).toBe(false);
  });

  it('rejects invalid payment_type', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, payment_type: 'installments' }).success).toBe(false);
  });

  it('accepts bank_transfer payment_method', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, payment_method: 'bank_transfer' }).success).toBe(true);
  });

  it('accepts deposit payment_type', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, payment_type: 'deposit' }).success).toBe(true);
  });

  it('accepts optional coupon_code', () => {
    expect(CreateBookingSchema.safeParse({ ...BASE, coupon_code: 'SUMMER10' }).success).toBe(true);
  });
});

// ─── InquirySchema ─────────────────────────────────────────────────────────────
describe('InquirySchema', () => {
  const BASE = {
    name:    'Bob Jones',
    email:   'bob@example.com',
    message: 'I am interested in booking for August.',
  };

  it('accepts a minimal valid inquiry', () => {
    expect(InquirySchema.safeParse(BASE).success).toBe(true);
  });

  it('requires message >= 2 chars', () => {
    expect(InquirySchema.safeParse({ ...BASE, message: 'X' }).success).toBe(false);
  });

  it('accepts optional listing_id as UUID', () => {
    expect(InquirySchema.safeParse({ ...BASE, listing_id: VALID_UUID }).success).toBe(true);
  });

  it('rejects listing_id that is not a UUID', () => {
    expect(InquirySchema.safeParse({ ...BASE, listing_id: 'bad-id' }).success).toBe(false);
  });
});

// ─── BlockDatesSchema ──────────────────────────────────────────────────────────
describe('BlockDatesSchema', () => {
  const BASE = {
    listing_id: VALID_UUID,
    start_date: '2025-09-01',
    end_date:   '2025-09-07',
  };

  it('accepts valid block dates', () => {
    expect(BlockDatesSchema.safeParse(BASE).success).toBe(true);
  });

  it('allows start_date === end_date (same-day)', () => {
    expect(BlockDatesSchema.safeParse({ ...BASE, end_date: '2025-09-01' }).success).toBe(true);
  });

  it('rejects end_date < start_date (refine)', () => {
    const result = BlockDatesSchema.safeParse({ ...BASE, end_date: '2025-08-31' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    expect(BlockDatesSchema.safeParse({ ...BASE, start_date: '09-01-2025' }).success).toBe(false);
  });
});

// ─── UpdateBookingSchema ───────────────────────────────────────────────────────
describe('UpdateBookingSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(UpdateBookingSchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid status', () => {
    expect(UpdateBookingSchema.safeParse({ status: 'confirmed' }).success).toBe(true);
  });

  it('rejects unknown status', () => {
    expect(UpdateBookingSchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('accepts valid payment_status', () => {
    expect(UpdateBookingSchema.safeParse({ payment_status: 'deposit_paid' }).success).toBe(true);
  });

  it('accepts valid payout_status', () => {
    expect(UpdateBookingSchema.safeParse({ payout_status: 'transferred' }).success).toBe(true);
  });
});

// ─── ListingSchema ─────────────────────────────────────────────────────────────
describe('ListingSchema', () => {
  const BASE = {
    slug:          'my-villa',
    title:         'Beautiful Villa',
    property_type: 'villa',
    max_guests:    8,
    bedrooms:      3,
    beds:          4,
    bathrooms:     2,
    base_price:    150,
  };

  it('accepts a valid minimal listing', () => {
    expect(ListingSchema.safeParse(BASE).success).toBe(true);
  });

  it('rejects slug with uppercase letters', () => {
    expect(ListingSchema.safeParse({ ...BASE, slug: 'My-Villa' }).success).toBe(false);
  });

  it('rejects slug with spaces', () => {
    expect(ListingSchema.safeParse({ ...BASE, slug: 'my villa' }).success).toBe(false);
  });

  it('rejects slug < 3 chars', () => {
    expect(ListingSchema.safeParse({ ...BASE, slug: 'ab' }).success).toBe(false);
  });

  it('rejects unknown property_type', () => {
    expect(ListingSchema.safeParse({ ...BASE, property_type: 'tent' }).success).toBe(false);
  });

  it('rejects base_price = 0', () => {
    expect(ListingSchema.safeParse({ ...BASE, base_price: 0 }).success).toBe(false);
  });

  it('rejects base_price negative', () => {
    expect(ListingSchema.safeParse({ ...BASE, base_price: -10 }).success).toBe(false);
  });

  it('rejects invalid check_in_time format', () => {
    expect(ListingSchema.safeParse({ ...BASE, check_in_time: '3pm' }).success).toBe(false);
  });

  it('accepts valid check_in_time HH:MM', () => {
    expect(ListingSchema.safeParse({ ...BASE, check_in_time: '14:00' }).success).toBe(true);
  });

  it('rejects invalid cancellation_policy', () => {
    expect(ListingSchema.safeParse({ ...BASE, cancellation_policy: 'lenient' }).success).toBe(false);
  });

  it('accepts deposit_percent 0–100', () => {
    expect(ListingSchema.safeParse({ ...BASE, deposit_percent: 30 }).success).toBe(true);
    expect(ListingSchema.safeParse({ ...BASE, deposit_percent: 0 }).success).toBe(true);
    expect(ListingSchema.safeParse({ ...BASE, deposit_percent: 100 }).success).toBe(true);
  });

  it('rejects deposit_percent > 100', () => {
    expect(ListingSchema.safeParse({ ...BASE, deposit_percent: 101 }).success).toBe(false);
  });
});

// ─── CouponSchema ──────────────────────────────────────────────────────────────
describe('CouponSchema', () => {
  const BASE = {
    code:           'SUMMER10',
    discount_type:  'percent',
    discount_value: 10,
  };

  it('accepts a valid coupon', () => {
    expect(CouponSchema.safeParse(BASE).success).toBe(true);
  });

  it('converts code to uppercase', () => {
    const result = CouponSchema.safeParse({ ...BASE, code: 'summer10' });
    if (!result.success) throw result.error;
    expect(result.data.code).toBe('SUMMER10');
  });

  it('rejects code < 3 chars', () => {
    expect(CouponSchema.safeParse({ ...BASE, code: 'AB' }).success).toBe(false);
  });

  it('rejects discount_type not in enum', () => {
    expect(CouponSchema.safeParse({ ...BASE, discount_type: 'points' }).success).toBe(false);
  });

  it('rejects discount_value <= 0', () => {
    expect(CouponSchema.safeParse({ ...BASE, discount_value: 0 }).success).toBe(false);
  });

  it('accepts fixed discount_type', () => {
    expect(CouponSchema.safeParse({ ...BASE, discount_type: 'fixed', discount_value: 50 }).success).toBe(true);
  });

  it('accepts optional listing_id as UUID', () => {
    expect(CouponSchema.safeParse({ ...BASE, listing_id: VALID_UUID }).success).toBe(true);
  });
});
