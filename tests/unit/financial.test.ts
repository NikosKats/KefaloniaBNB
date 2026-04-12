// tests/unit/financial.test.ts

import { describe, it, expect } from 'vitest';
import {
  calcBookingPrice,
  calcCleaningFees,
  calcRefund,
  calcDeposit,
  assertBookingInvariant,
  assertCleaningInvariant,
  PLATFORM_BOOKING_FEE_RATE,
  PLATFORM_CLEANING_FEE_RATE,
} from '../../src/lib/financial';

// ─── Booking price calculations ───────────────────────────────────────────────

describe('calcBookingPrice', () => {

  it('S01: 7 nights × €185 + €80 cleaning = €1,375 total', () => {
    const r = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });
    expect(r.subtotal).toBe(1295);
    expect(r.cleaningFee).toBe(80);
    expect(r.totalCharged).toBe(1375);
  });

  it('S01: platform fee is 5% of total = €68.75', () => {
    const r = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });
    expect(r.platformFee).toBe(68.75);
  });

  it('S01: owner payout = total − platform fee = €1,306.25', () => {
    const r = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });
    expect(r.ownerPayout).toBe(1306.25);
  });

  it('invariant: platformFee + ownerPayout === totalCharged', () => {
    const r = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });
    expect(r.platformFee + r.ownerPayout).toBe(r.totalCharged);
    expect(() => assertBookingInvariant(r)).not.toThrow();
  });

  it('handles zero cleaning fee correctly', () => {
    const r = calcBookingPrice({ pricePerNight: 150, nights: 3, cleaningFee: 0 });
    expect(r.totalCharged).toBe(450);
    expect(r.cleaningFee).toBe(0);
    expect(r.subtotal).toBe(450);
  });

  it('handles custom platform fee rate', () => {
    const r = calcBookingPrice({ pricePerNight: 100, nights: 1, cleaningFee: 0, platformFeeRate: 0.10 });
    expect(r.platformFee).toBe(10);
    expect(r.ownerPayout).toBe(90);
  });

  it('floating point: 3 nights × €99.99 rounds correctly', () => {
    const r = calcBookingPrice({ pricePerNight: 99.99, nights: 3, cleaningFee: 0 });
    expect(r.subtotal).toBe(299.97);
    expect(r.platformFee + r.ownerPayout).toBe(r.totalCharged);
  });

  it('studio: 2 nights × €75 + €30 cleaning', () => {
    const r = calcBookingPrice({ pricePerNight: 75, nights: 2, cleaningFee: 30 });
    expect(r.subtotal).toBe(150);
    expect(r.totalCharged).toBe(180);
    expect(r.platformFee).toBe(9);
    expect(r.ownerPayout).toBe(171);
  });

  it('uses PLATFORM_BOOKING_FEE_RATE constant by default', () => {
    const r = calcBookingPrice({ pricePerNight: 100, nights: 1, cleaningFee: 0 });
    expect(r.platformFee).toBe(round2(100 * PLATFORM_BOOKING_FEE_RATE));
  });

  it('owner with no Stripe: zero cleaning fee, 1 night', () => {
    const r = calcBookingPrice({ pricePerNight: 120, nights: 1, cleaningFee: 0 });
    expect(r.totalCharged).toBe(120);
    expect(r.platformFee + r.ownerPayout).toBe(120);
  });

});

// ─── Cleaning fee calculations ────────────────────────────────────────────────

describe('calcCleaningFees', () => {

  it('S01: €85 bid → €4.25 platform fee → €80.75 cleaner payout', () => {
    const r = calcCleaningFees({ agreedPrice: 85 });
    expect(r.platformFee).toBe(4.25);
    expect(r.cleanerPayout).toBe(80.75);
  });

  it('invariant: cleanerPayout + platformFee === agreedPrice', () => {
    const r = calcCleaningFees({ agreedPrice: 85 });
    expect(r.cleanerPayout + r.platformFee).toBe(r.agreedPrice);
    expect(() => assertCleaningInvariant(r)).not.toThrow();
  });

  it('€120 bid → €6 platform fee → €114 payout', () => {
    const r = calcCleaningFees({ agreedPrice: 120 });
    expect(r.platformFee).toBe(6);
    expect(r.cleanerPayout).toBe(114);
  });

  it('S07: partial dispute resolution €60 → €3 fee → €57 payout', () => {
    const r = calcCleaningFees({ agreedPrice: 60 });
    expect(r.platformFee).toBe(3);
    expect(r.cleanerPayout).toBe(57);
  });

  it('Stavros bid €70 → €3.50 fee → €66.50 payout', () => {
    const r = calcCleaningFees({ agreedPrice: 70 });
    expect(r.platformFee).toBe(3.50);
    expect(r.cleanerPayout).toBe(66.50);
  });

  it('custom platform fee rate', () => {
    const r = calcCleaningFees({ agreedPrice: 100, platformFeeRate: 0.05 });
    expect(r.platformFee).toBe(5);
    expect(r.cleanerPayout).toBe(95);
  });

  it('uses PLATFORM_CLEANING_FEE_RATE constant by default', () => {
    const r = calcCleaningFees({ agreedPrice: 100 });
    expect(r.platformFee).toBe(round2(100 * PLATFORM_CLEANING_FEE_RATE));
  });

  it('invariant holds for edge price €1', () => {
    const r = calcCleaningFees({ agreedPrice: 1 });
    expect(r.platformFee + r.cleanerPayout).toBe(r.agreedPrice);
  });

});

// ─── Refund calculations ──────────────────────────────────────────────────────

describe('calcRefund', () => {

  it('full refund when 0 nights used (pre-check-in cancellation)', () => {
    // Nightly value = (1375 - 80) / 7 = 185. Unused = 7 → refund = 1295
    expect(calcRefund(1375, 0, 7, 80)).toBe(1295);
  });

  it('partial refund for 3 nights used out of 7', () => {
    // Nightly = 185, unused = 4, refund = 740
    expect(calcRefund(1375, 3, 7, 80)).toBe(740);
  });

  it('no refund when full stay completed', () => {
    expect(calcRefund(1375, 7, 7, 80)).toBe(0);
  });

  it('cleaning fee is never included in refund', () => {
    const withFee    = calcRefund(1375, 0, 7, 80);
    const withoutFee = calcRefund(1375, 0, 7, 0);
    // With cleaning fee excluded, refund is less
    expect(withFee).toBeLessThan(withoutFee);
    expect(withFee).toBe(1295);  // not 1375
  });

  it('1 night used out of 3', () => {
    // total=450, cleaningFee=0, nightly=150, unused=2, refund=300
    expect(calcRefund(450, 1, 3, 0)).toBe(300);
  });

});

// ─── Deposit calculations ─────────────────────────────────────────────────────

describe('calcDeposit', () => {

  it('30% deposit of €1375 = €412.50, remaining €962.50', () => {
    const r = calcDeposit({ totalCharged: 1375, depositPercent: 30 });
    expect(r.depositAmount).toBe(412.50);
    expect(r.remainingAmount).toBe(962.50);
  });

  it('depositAmount + remainingAmount === totalCharged', () => {
    const r = calcDeposit({ totalCharged: 1375, depositPercent: 30 });
    expect(r.depositAmount + r.remainingAmount).toBe(1375);
  });

  it('20% deposit of €750', () => {
    const r = calcDeposit({ totalCharged: 750, depositPercent: 20 });
    expect(r.depositAmount).toBe(150);
    expect(r.remainingAmount).toBe(600);
  });

  it('50% deposit splits evenly', () => {
    const r = calcDeposit({ totalCharged: 500, depositPercent: 50 });
    expect(r.depositAmount).toBe(250);
    expect(r.remainingAmount).toBe(250);
  });

});

// ─── Cross-entity financial reconciliation ─────────────────────────────────────

describe('Platform total income reconciliation', () => {

  it('S01: booking fee + cleaning fee = total platform income', () => {
    const booking  = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });
    const cleaning = calcCleaningFees({ agreedPrice: 85 });
    expect(booking.platformFee + cleaning.platformFee).toBe(73); // 68.75 + 4.25
  });

  it('invariants hold simultaneously for booking and cleaning', () => {
    const booking  = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });
    const cleaning = calcCleaningFees({ agreedPrice: 85 });
    expect(() => assertBookingInvariant(booking)).not.toThrow();
    expect(() => assertCleaningInvariant(cleaning)).not.toThrow();
  });

  it('no money created or destroyed in booking split', () => {
    for (const nights of [1, 3, 7, 14, 30]) {
      const r = calcBookingPrice({ pricePerNight: 185, nights, cleaningFee: 80 });
      expect(r.platformFee + r.ownerPayout).toBe(r.totalCharged);
    }
  });

  it('no money created or destroyed in cleaning split', () => {
    for (const price of [50, 75, 85, 120, 200]) {
      const r = calcCleaningFees({ agreedPrice: price });
      expect(r.platformFee + r.cleanerPayout).toBe(r.agreedPrice);
    }
  });

});

// ─── Helper ───────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
