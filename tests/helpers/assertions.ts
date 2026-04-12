// tests/helpers/assertions.ts
// Domain-specific assertion helpers used across unit, integration, and E2E tests.
// All functions throw with descriptive messages on failure.

// ─── Booking financial invariants ──────────────────────────────────────────────

interface BookingRecord {
  total_price:  number;
  platform_fee: number;
  owner_payout: number;
  cleaning_fee?: number;
}

/**
 * Assert that platform_fee + owner_payout === total_price (no money lost).
 */
export function assertNoMoneyLost(booking: BookingRecord): void {
  const sum = Math.round((booking.platform_fee + booking.owner_payout) * 100) / 100;
  if (sum !== booking.total_price) {
    throw new Error(
      `Booking money-lost invariant violated: ` +
      `platform_fee (${booking.platform_fee}) + owner_payout (${booking.owner_payout}) ` +
      `= ${sum} ≠ total_price (${booking.total_price})`,
    );
  }
}

/**
 * Assert exact financial values for the S01 booking (7 nights × €185 + €80 cleaning).
 */
export function assertS01BookingFinancials(booking: BookingRecord): void {
  assertNoMoneyLost(booking);

  if (booking.total_price !== 1375) {
    throw new Error(`Expected total_price=1375, got ${booking.total_price}`);
  }
  if (booking.platform_fee !== 206.25) {
    throw new Error(`Expected platform_fee=206.25, got ${booking.platform_fee}`);
  }
  if (booking.owner_payout !== 1168.75) {
    throw new Error(`Expected owner_payout=1168.75, got ${booking.owner_payout}`);
  }
}

// ─── Cleaning job financial invariants ────────────────────────────────────────

interface CleaningJobRecord {
  agreed_price:   number;
  platform_fee:   number;
  cleaner_payout: number;
}

/**
 * Assert that platform_fee + cleaner_payout === agreed_price (no money lost).
 */
export function assertCleaningPayout(job: CleaningJobRecord): void {
  const sum = Math.round((job.platform_fee + job.cleaner_payout) * 100) / 100;
  if (sum !== job.agreed_price) {
    throw new Error(
      `Cleaning payout invariant violated: ` +
      `platform_fee (${job.platform_fee}) + cleaner_payout (${job.cleaner_payout}) ` +
      `= ${sum} ≠ agreed_price (${job.agreed_price})`,
    );
  }
}

/**
 * Assert exact financial values for the S01 cleaning job (Elena, €85 bid).
 */
export function assertS01CleaningFinancials(job: CleaningJobRecord): void {
  assertCleaningPayout(job);

  if (job.agreed_price !== 85) {
    throw new Error(`Expected agreed_price=85, got ${job.agreed_price}`);
  }
  if (job.platform_fee !== 8.50) {
    throw new Error(`Expected platform_fee=8.50, got ${job.platform_fee}`);
  }
  if (job.cleaner_payout !== 76.50) {
    throw new Error(`Expected cleaner_payout=76.50, got ${job.cleaner_payout}`);
  }
}

// ─── Booking status helpers ───────────────────────────────────────────────────

type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export function assertPaymentStatus(
  actual: string,
  expected: PaymentStatus,
  context = 'booking',
): void {
  if (actual !== expected) {
    throw new Error(`${context} payment_status: expected '${expected}', got '${actual}'`);
  }
}

export function assertBookingStatus(
  actual: string,
  expected: BookingStatus,
  context = 'booking',
): void {
  if (actual !== expected) {
    throw new Error(`${context} status: expected '${expected}', got '${actual}'`);
  }
}

// ─── Date range helpers ───────────────────────────────────────────────────────

/**
 * Assert two date ranges do NOT overlap (half-open intervals).
 * Throws if they do.
 */
export function assertNoDateOverlap(
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string },
): void {
  const overlap = a.checkIn < b.checkOut && a.checkOut > b.checkIn;
  if (overlap) {
    throw new Error(
      `Date ranges overlap: [${a.checkIn}, ${a.checkOut}) and [${b.checkIn}, ${b.checkOut})`,
    );
  }
}

/**
 * Assert two date ranges DO overlap.
 */
export function assertDateOverlap(
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string },
): void {
  const overlap = a.checkIn < b.checkOut && a.checkOut > b.checkIn;
  if (!overlap) {
    throw new Error(
      `Expected overlap but ranges are disjoint: [${a.checkIn}, ${a.checkOut}) and [${b.checkIn}, ${b.checkOut})`,
    );
  }
}

// ─── API response helpers ─────────────────────────────────────────────────────

/** Assert a fetch Response has the expected status code. */
export async function assertStatus(
  res: Response,
  expected: number,
  context = 'request',
): Promise<void> {
  if (res.status !== expected) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(
      `${context}: expected status ${expected}, got ${res.status}. Body: ${body.slice(0, 200)}`,
    );
  }
}

/** Assert a Response is OK (2xx) and return its parsed JSON. */
export async function assertOkJson<T = unknown>(
  res: Response,
  context = 'request',
): Promise<T> {
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(
      `${context}: expected 2xx, got ${res.status}. Body: ${body.slice(0, 200)}`,
    );
  }
  return res.json() as Promise<T>;
}
