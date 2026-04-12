import { describe, it, expect } from 'vitest';
import { calculatePriceClient, formatPrice, getCancellationDescription } from '../../src/lib/pricing.ts';
import { makeListing, makeSeason } from '../fixtures/factories.ts';

const BASE = makeListing({
  base_price: 100,
  cleaning_fee: 50,
  extra_guest_fee: 15,
  extra_guest_after: 4,
});

describe('calculatePriceClient', () => {
  describe('base calculation', () => {
    it('computes correct nights and base total', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 2);
      expect(result.nights).toBe(7);
      expect(result.baseTotal).toBe(700);
      expect(result.cleaningFee).toBe(50);
      expect(result.total).toBe(750);
    });

    it('returns 1 night for consecutive dates', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-02', 2);
      expect(result.nights).toBe(1);
      expect(result.baseTotal).toBe(100);
    });
  });

  describe('season modifier', () => {
    const highSeason = makeSeason({
      start_date: '2025-07-01',
      end_date: '2025-08-31',
      price_modifier: 1.5,
    });

    it('applies season modifier when dates are within season', () => {
      const result = calculatePriceClient(BASE, '2025-07-01', '2025-07-08', 2, [highSeason]);
      expect(result.seasonModifier).toBe(1.5);
      expect(result.basePrice).toBe(150);
      expect(result.baseTotal).toBe(1050);
    });

    it('does not apply season modifier when dates are outside season', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 2, [highSeason]);
      expect(result.seasonModifier).toBe(1.0);
      expect(result.basePrice).toBe(100);
    });

    it('uses modifier=1.0 when no seasons provided', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 2, []);
      expect(result.seasonModifier).toBe(1.0);
    });
  });

  describe('extra guest fee', () => {
    it('charges no extra fee when guests <= extra_guest_after threshold', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 4);
      expect(result.extraGuestFee).toBe(0);
    });

    it('charges extra fee for guests above threshold — boundary at threshold+1', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 5); // 1 extra
      expect(result.extraGuestFee).toBe(15 * 1 * 7); // fee × extra × nights
    });

    it('charges proportionally for multiple extra guests', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 6); // 2 extra
      expect(result.extraGuestFee).toBe(15 * 2 * 7);
    });

    it('charges nothing when guests=1 and threshold=4', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-02', 1);
      expect(result.extraGuestFee).toBe(0);
    });
  });

  describe('coupon discount', () => {
    it('subtracts coupon from total', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 2, [], 50);
      expect(result.couponDiscount).toBe(50);
      expect(result.total).toBe(750 - 50); // 700+50 base - 50 coupon
    });

    it('clamps total to 0 when discount exceeds subtotal', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-02', 2, [], 99999);
      expect(result.total).toBe(0);
    });

    it('returns 0 coupon discount when none applied', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 2);
      expect(result.couponDiscount).toBe(0);
    });
  });

  describe('currency', () => {
    it('defaults to EUR', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-02', 2);
      expect(result.currency).toBe('EUR');
    });

    it('accepts custom currency', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-02', 2, [], 0, 'USD');
      expect(result.currency).toBe('USD');
    });
  });

  describe('taxes', () => {
    it('returns 0 taxes (not yet implemented)', () => {
      const result = calculatePriceClient(BASE, '2025-09-01', '2025-09-08', 2);
      expect(result.taxes).toBe(0);
    });
  });
});

describe('formatPrice', () => {
  it.each([
    [100, 'EUR', '€100'],
    [1500, 'EUR', '€1,500'],
    [0, 'EUR', '€0'],
  ])('formats %d %s as "%s"', (amount, currency, expected) => {
    expect(formatPrice(amount, currency)).toBe(expected);
  });

  it('defaults to EUR', () => {
    expect(formatPrice(200)).toBe('€200');
  });
});

describe('getCancellationDescription', () => {
  it.each(['flexible', 'moderate', 'strict'] as const)(
    'returns a non-empty string for %s policy',
    (policy) => {
      const desc = getCancellationDescription(policy);
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(10);
    }
  );

  it('mentions refund for flexible policy', () => {
    expect(getCancellationDescription('flexible')).toContain('refund');
  });

  it('mentions 48h for strict policy', () => {
    expect(getCancellationDescription('strict')).toContain('48h');
  });
});
