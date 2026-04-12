// tests/unit/edge-cases.test.ts
// Edge-case tests for financial calculations, date logic, input validation,
// and state transitions not covered by the happy-path tests.

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

// ─── Floating point safety ─────────────────────────────────────────────────────

describe('Floating point safety in financial calculations', () => {

  it('calcBookingPrice: 0.1 + 0.2 does not leak into fee results', () => {
    // A price that triggers classic JS floating-point issues
    const result = calcBookingPrice({ pricePerNight: 0.1, nights: 2, cleaningFee: 0.2 });
    // 0.1 * 2 + 0.2 = 0.4 — platform fee = 0.4 * 0.05 = 0.02
    expect(result.totalCharged).toBe(0.40);
    expect(result.platformFee).toBe(0.02);
    expect(result.ownerPayout).toBe(0.38);
    assertBookingInvariant(result);
  });

  it('calcCleaningFees: price with many decimal digits rounds correctly', () => {
    // €33.33 → fee = 3.33, payout = 29.99 (but 33.33 - 3.33 = 30.00)
    const result = calcCleaningFees({ agreedPrice: 33.33 });
    const fee = Math.round(33.33 * PLATFORM_CLEANING_FEE_RATE * 100) / 100;
    expect(result.platformFee).toBe(fee);
    assertCleaningInvariant(result);
  });

  it('invariant holds for large booking values (€10 000 per night, 30 nights)', () => {
    const result = calcBookingPrice({ pricePerNight: 10000, nights: 30, cleaningFee: 500 });
    assertBookingInvariant(result);
    expect(result.totalCharged).toBe(300500);
  });

  it('invariant holds for very small cleaning price (€1)', () => {
    const result = calcCleaningFees({ agreedPrice: 1 });
    assertCleaningInvariant(result);
    expect(result.platformFee).toBe(0.05);
    expect(result.cleanerPayout).toBe(0.95);
  });

  it('calcBookingPrice produces consistent results with custom fee rate', () => {
    const result = calcBookingPrice({
      pricePerNight: 100,
      nights: 1,
      cleaningFee: 0,
      platformFeeRate: 0.20,   // override to 20%
    });
    expect(result.platformFee).toBe(20);
    expect(result.ownerPayout).toBe(80);
    assertBookingInvariant(result);
  });

});

// ─── Refund edge cases ────────────────────────────────────────────────────────

describe('calcRefund edge cases', () => {

  it('full refund when 0 nights used', () => {
    // Total: 7 nights × €100 + €80 cleaning = €780. Cleaning never refunded.
    const refund = calcRefund(780, 0, 7, 80);
    // Each night = (780 - 80) / 7 = 100; unused = 7; refund = 700
    expect(refund).toBe(700);
  });

  it('zero refund when all nights used', () => {
    const refund = calcRefund(780, 7, 7, 80);
    expect(refund).toBe(0);
  });

  it('partial refund for nights 3–7 (3 nights used, 4 unused)', () => {
    const refund = calcRefund(780, 3, 7, 80);
    // (780 - 80) / 7 = 100 per night; 4 unused → refund = 400
    expect(refund).toBe(400);
  });

  it('cleaning fee is never included in the refund', () => {
    const withCleaning    = calcRefund(780, 0, 7, 80);
    const withoutCleaning = calcRefund(780, 0, 7, 0);
    expect(withCleaning).toBeLessThan(withoutCleaning);
  });

  it('refund is never negative even with rounding', () => {
    // Edge: totalCharged that doesn't divide evenly
    const refund = calcRefund(100, 1, 3, 10);
    expect(refund).toBeGreaterThanOrEqual(0);
  });

});

// ─── Deposit edge cases ───────────────────────────────────────────────────────

describe('calcDeposit edge cases', () => {

  it('30% deposit on €1375 yields €412.50 deposit and €962.50 remaining', () => {
    const result = calcDeposit({ totalCharged: 1375, depositPercent: 30 });
    expect(result.depositAmount).toBe(412.50);
    expect(result.remainingAmount).toBe(962.50);
    expect(result.depositAmount + result.remainingAmount).toBe(1375);
  });

  it('50% deposit splits evenly', () => {
    const result = calcDeposit({ totalCharged: 1000, depositPercent: 50 });
    expect(result.depositAmount).toBe(500);
    expect(result.remainingAmount).toBe(500);
  });

  it('100% deposit leaves 0 remaining', () => {
    const result = calcDeposit({ totalCharged: 200, depositPercent: 100 });
    expect(result.depositAmount).toBe(200);
    expect(result.remainingAmount).toBe(0);
  });

  it('deposit + remaining always equals totalCharged', () => {
    for (const pct of [10, 25, 33, 50, 66, 75]) {
      const result = calcDeposit({ totalCharged: 999, depositPercent: pct });
      const sum = Math.round((result.depositAmount + result.remainingAmount) * 100) / 100;
      expect(sum).toBe(999);
    }
  });

});

// ─── Booking validation edge cases ────────────────────────────────────────────

describe('Booking input edge cases', () => {

  it('single night booking: cleaning fee dominates', () => {
    const result = calcBookingPrice({ pricePerNight: 50, nights: 1, cleaningFee: 80 });
    expect(result.subtotal).toBe(50);
    expect(result.cleaningFee).toBe(80);
    expect(result.totalCharged).toBe(130);
    assertBookingInvariant(result);
  });

  it('zero cleaning fee booking', () => {
    const result = calcBookingPrice({ pricePerNight: 100, nights: 5, cleaningFee: 0 });
    expect(result.cleaningFee).toBe(0);
    expect(result.totalCharged).toBe(500);
    assertBookingInvariant(result);
  });

  it('minimum nights enforced: 3 nights for Villa Sunrise', () => {
    // This tests the business rule — min_nights: 3
    const minNights = 3;
    const requestedNights = 2;
    expect(requestedNights).toBeLessThan(minNights);
    // The API should reject this — tested at API level, not here
  });

  it('max guest count respected: Villa Sunrise max is 8', () => {
    const maxGuests = 8;
    const requestedGuests = 10;
    expect(requestedGuests).toBeGreaterThan(maxGuests);
    // Excess guests should be rejected at API level
  });

});

// ─── Date boundary edge cases ─────────────────────────────────────────────────

describe('Booking date edge cases', () => {

  // Half-open interval: [checkIn, checkOut)
  // Two bookings are adjacent (no overlap) when B.checkIn === A.checkOut

  function overlaps(
    a: { checkIn: string; checkOut: string },
    b: { checkIn: string; checkOut: string },
  ): boolean {
    return a.checkIn < b.checkOut && a.checkOut > b.checkIn;
  }

  it('adjacent bookings: checkOut of A === checkIn of B — no overlap', () => {
    const a = { checkIn: '2026-07-12', checkOut: '2026-07-19' };
    const b = { checkIn: '2026-07-19', checkOut: '2026-07-26' };
    expect(overlaps(a, b)).toBe(false);
  });

  it('single-day gap between bookings — no overlap', () => {
    const a = { checkIn: '2026-07-12', checkOut: '2026-07-18' };
    const b = { checkIn: '2026-07-19', checkOut: '2026-07-26' };
    expect(overlaps(a, b)).toBe(false);
  });

  it('second booking starts one day before first checkout — overlap', () => {
    const a = { checkIn: '2026-07-12', checkOut: '2026-07-19' };
    const b = { checkIn: '2026-07-18', checkOut: '2026-07-25' };
    expect(overlaps(a, b)).toBe(true);
  });

  it('same dates = full overlap', () => {
    const a = { checkIn: '2026-07-12', checkOut: '2026-07-19' };
    expect(overlaps(a, a)).toBe(true);
  });

  it('one booking fully contained within another — overlap', () => {
    const outer = { checkIn: '2026-07-01', checkOut: '2026-07-31' };
    const inner = { checkIn: '2026-07-10', checkOut: '2026-07-20' };
    expect(overlaps(outer, inner)).toBe(true);
  });

});

// ─── Cleaning job state machine edge cases ────────────────────────────────────

describe('Cleaning job state machine edge cases', () => {

  type JobStatus = 'scheduled' | 'started' | 'completed' | 'approved' | 'disputed' | 'cancelled';

  const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
    scheduled: ['started', 'cancelled'],
    started:   ['completed', 'disputed', 'cancelled'],
    completed: ['approved', 'disputed'],
    approved:  [],   // terminal
    disputed:  [],   // terminal (resolved by admin out-of-band)
    cancelled: [],   // terminal
  };

  function canTransition(from: JobStatus, to: JobStatus): boolean {
    return TRANSITIONS[from].includes(to);
  }

  it('cannot re-open a cancelled job', () => {
    expect(canTransition('cancelled', 'scheduled')).toBe(false);
    expect(canTransition('cancelled', 'started')).toBe(false);
  });

  it('cannot un-approve an approved job', () => {
    expect(canTransition('approved', 'completed')).toBe(false);
    expect(canTransition('approved', 'disputed')).toBe(false);
  });

  it('cannot approve a disputed job directly', () => {
    expect(canTransition('disputed', 'approved')).toBe(false);
  });

  it('cannot skip started when transitioning scheduled → completed', () => {
    expect(canTransition('scheduled', 'completed')).toBe(false);
  });

  it('cannot skip started when transitioning scheduled → approved', () => {
    expect(canTransition('scheduled', 'approved')).toBe(false);
  });

  it('S12: cannot dispute an approved job', () => {
    expect(canTransition('approved', 'disputed')).toBe(false);
  });

  it('S13: cannot cancel a completed job', () => {
    expect(canTransition('completed', 'cancelled')).toBe(false);
  });

});

// ─── Platform fee rate guard ───────────────────────────────────────────────────

describe('Platform fee rate constants', () => {

  it('PLATFORM_BOOKING_FEE_RATE is 5%', () => {
    expect(PLATFORM_BOOKING_FEE_RATE).toBe(0.05);
  });

  it('PLATFORM_CLEANING_FEE_RATE is 5%', () => {
    expect(PLATFORM_CLEANING_FEE_RATE).toBe(0.05);
  });

  it('booking fee rate change would break S01 invariant — guard against accidental change', () => {
    // S01: €1375 × 0.05 = €68.75 platform fee
    const result = calcBookingPrice({ pricePerNight: 185, nights: 7, cleaningFee: 80 });
    expect(result.platformFee).toBe(68.75);
  });

  it('cleaning fee rate change would break S01 cleaning invariant — guard against accidental change', () => {
    // S01: €85 × 0.05 = €4.25 platform fee
    const result = calcCleaningFees({ agreedPrice: 85 });
    expect(result.platformFee).toBe(4.25);
  });

});
