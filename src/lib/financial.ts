// src/lib/financial.ts
// Pure financial calculation functions — no I/O, fully testable.

export const PLATFORM_BOOKING_FEE_RATE  = 0.05;   // 5% of gross booking total
export const PLATFORM_CLEANING_FEE_RATE = 0.05;   // 5% of agreed cleaning price

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface BookingPriceInput {
  pricePerNight: number;
  nights: number;
  cleaningFee: number;
  platformFeeRate?: number;  // defaults to PLATFORM_BOOKING_FEE_RATE
}

export interface BookingPriceResult {
  subtotal: number;       // nights × pricePerNight
  cleaningFee: number;
  totalCharged: number;   // subtotal + cleaningFee
  platformFee: number;    // totalCharged × rate
  ownerPayout: number;    // totalCharged − platformFee
}

export function calcBookingPrice(input: BookingPriceInput): BookingPriceResult {
  const rate         = input.platformFeeRate ?? PLATFORM_BOOKING_FEE_RATE;
  const subtotal     = round2(input.pricePerNight * input.nights);
  const cleaningFee  = round2(input.cleaningFee);
  const totalCharged = round2(subtotal + cleaningFee);
  const platformFee  = round2(totalCharged * rate);
  const ownerPayout  = round2(totalCharged - platformFee);
  return { subtotal, cleaningFee, totalCharged, platformFee, ownerPayout };
}

// ─── Cleaning ─────────────────────────────────────────────────────────────────

export interface CleaningFeeInput {
  agreedPrice: number;
  platformFeeRate?: number;  // defaults to PLATFORM_CLEANING_FEE_RATE
}

export interface CleaningFeeResult {
  agreedPrice: number;
  platformFee: number;
  cleanerPayout: number;
}

export function calcCleaningFees(input: CleaningFeeInput): CleaningFeeResult {
  const rate          = input.platformFeeRate ?? PLATFORM_CLEANING_FEE_RATE;
  const platformFee   = round2(input.agreedPrice * rate);
  const cleanerPayout = round2(input.agreedPrice - platformFee);
  return { agreedPrice: input.agreedPrice, platformFee, cleanerPayout };
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

/**
 * Calculate refund amount for a partial stay cancellation.
 * Cleaning fee is never refunded.
 */
export function calcRefund(
  totalCharged: number,
  nightsUsed: number,
  totalNights: number,
  cleaningFee: number,
): number {
  const nightlyValue = round2((totalCharged - cleaningFee) / totalNights);
  const unusedNights = totalNights - nightsUsed;
  return round2(nightlyValue * unusedNights);
}

// ─── Deposit ──────────────────────────────────────────────────────────────────

export interface DepositInput {
  totalCharged: number;
  depositPercent: number;  // e.g. 30 for 30%
}

export interface DepositResult {
  depositAmount: number;
  remainingAmount: number;
}

export function calcDeposit(input: DepositInput): DepositResult {
  const depositAmount   = round2(input.totalCharged * input.depositPercent / 100);
  const remainingAmount = round2(input.totalCharged - depositAmount);
  return { depositAmount, remainingAmount };
}

// ─── Invariant assertions (use in tests) ──────────────────────────────────────

export function assertBookingInvariant(result: BookingPriceResult): void {
  const sum = round2(result.platformFee + result.ownerPayout);
  if (sum !== result.totalCharged) {
    throw new Error(
      `Booking invariant violated: platformFee(${result.platformFee}) + ownerPayout(${result.ownerPayout}) = ${sum} ≠ totalCharged(${result.totalCharged})`
    );
  }
}

export function assertCleaningInvariant(result: CleaningFeeResult): void {
  const sum = round2(result.platformFee + result.cleanerPayout);
  if (sum !== result.agreedPrice) {
    throw new Error(
      `Cleaning invariant violated: platformFee(${result.platformFee}) + cleanerPayout(${result.cleanerPayout}) = ${sum} ≠ agreedPrice(${result.agreedPrice})`
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
