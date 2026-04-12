// tests/unit/date-overlap.test.ts
// Exhaustive tests for the date overlap predicate used by availability checks.
// datesOverlap uses half-open interval semantics: [checkIn, checkOut)
// meaning checkout day is NOT part of the stay — adjacent bookings are allowed.

import { describe, it, expect } from 'vitest';

function datesOverlap(
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string },
): boolean {
  return a.checkIn < b.checkOut && a.checkOut > b.checkIn;
}

describe('Booking availability overlap (half-open intervals)', () => {

  it('identical date ranges overlap', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
    )).toBe(true);
  });

  it('adjacent dates do NOT overlap — checkout day equals next check-in', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
      { checkIn: '2026-07-19', checkOut: '2026-07-26' },
    )).toBe(false);
  });

  it('overlapping ranges (B starts mid-A) overlap', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
      { checkIn: '2026-07-15', checkOut: '2026-07-22' },
    )).toBe(true);
  });

  it('B fully contained inside A overlaps', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-10', checkOut: '2026-07-25' },
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
    )).toBe(true);
  });

  it('A fully contained inside B overlaps', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
      { checkIn: '2026-07-10', checkOut: '2026-07-25' },
    )).toBe(true);
  });

  it('no overlap — A is entirely before B', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-01', checkOut: '2026-07-10' },
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
    )).toBe(false);
  });

  it('no overlap — A is entirely after B', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-20', checkOut: '2026-07-27' },
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
    )).toBe(false);
  });

  it('single-night stay does not overlap with adjacent stay', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-12', checkOut: '2026-07-13' },
      { checkIn: '2026-07-13', checkOut: '2026-07-14' },
    )).toBe(false);
  });

  it('single-night stay overlaps itself', () => {
    expect(datesOverlap(
      { checkIn: '2026-07-12', checkOut: '2026-07-13' },
      { checkIn: '2026-07-12', checkOut: '2026-07-13' },
    )).toBe(true);
  });

  it('S01 booking does not conflict with S02 booking (different dates)', () => {
    // Maria: Jul 12–19, Kostas: Jul 26–Aug 2
    expect(datesOverlap(
      { checkIn: '2026-07-12', checkOut: '2026-07-19' },
      { checkIn: '2026-07-26', checkOut: '2026-08-02' },
    )).toBe(false);
  });

  it('overlap is symmetric', () => {
    const a = { checkIn: '2026-07-12', checkOut: '2026-07-19' };
    const b = { checkIn: '2026-07-15', checkOut: '2026-07-22' };
    expect(datesOverlap(a, b)).toBe(datesOverlap(b, a));
  });

});
