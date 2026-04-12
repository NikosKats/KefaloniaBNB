import { describe, it, expect } from 'vitest';
import {
  isDateRangeAvailable,
  getUnavailableDates,
  addDays,
  toDateString,
} from '../../src/lib/availability.ts';
import { makeDateRange } from '../fixtures/factories.ts';

describe('isDateRangeAvailable', () => {
  describe('no blocked ranges', () => {
    it('returns true when there are no blocked ranges', () => {
      expect(isDateRangeAvailable('2025-09-01', '2025-09-08', [])).toBe(true);
    });
  });

  describe('non-overlapping ranges', () => {
    it('returns true when request is entirely before a blocked range', () => {
      const blocked = [makeDateRange('2025-09-10', '2025-09-15')];
      expect(isDateRangeAvailable('2025-09-01', '2025-09-08', blocked)).toBe(true);
    });

    it('returns true when request is entirely after a blocked range', () => {
      const blocked = [makeDateRange('2025-09-01', '2025-09-05')];
      expect(isDateRangeAvailable('2025-09-10', '2025-09-15', blocked)).toBe(true);
    });

    it('returns true when check-out date equals blocked range start (adjacent, not overlapping)', () => {
      const blocked = [makeDateRange('2025-09-08', '2025-09-15')];
      // checkout on 08 = guest leaves, blocked starts same day → OK (half-open interval)
      expect(isDateRangeAvailable('2025-09-01', '2025-09-08', blocked)).toBe(true);
    });

    it('returns true when check-in date equals blocked range end (adjacent, not overlapping)', () => {
      const blocked = [makeDateRange('2025-09-01', '2025-09-05')];
      expect(isDateRangeAvailable('2025-09-05', '2025-09-10', blocked)).toBe(true);
    });
  });

  describe('overlapping ranges', () => {
    it('returns false when request fully contains a blocked range', () => {
      const blocked = [makeDateRange('2025-09-03', '2025-09-05')];
      expect(isDateRangeAvailable('2025-09-01', '2025-09-08', blocked)).toBe(false);
    });

    it('returns false when blocked range fully contains the request', () => {
      const blocked = [makeDateRange('2025-09-01', '2025-09-15')];
      expect(isDateRangeAvailable('2025-09-05', '2025-09-10', blocked)).toBe(false);
    });

    it('returns false when request starts inside a blocked range', () => {
      const blocked = [makeDateRange('2025-09-01', '2025-09-10')];
      expect(isDateRangeAvailable('2025-09-05', '2025-09-15', blocked)).toBe(false);
    });

    it('returns false when request ends inside a blocked range', () => {
      const blocked = [makeDateRange('2025-09-08', '2025-09-15')];
      expect(isDateRangeAvailable('2025-09-01', '2025-09-10', blocked)).toBe(false);
    });

    it('returns false when dates are identical to blocked range', () => {
      const blocked = [makeDateRange('2025-09-01', '2025-09-08')];
      expect(isDateRangeAvailable('2025-09-01', '2025-09-08', blocked)).toBe(false);
    });
  });

  describe('multiple blocked ranges', () => {
    it('returns false when any one of multiple ranges overlaps', () => {
      const blocked = [
        makeDateRange('2025-09-01', '2025-09-03'),
        makeDateRange('2025-09-10', '2025-09-15'),
        makeDateRange('2025-09-20', '2025-09-25'),
      ];
      // Overlaps only the second block
      expect(isDateRangeAvailable('2025-09-08', '2025-09-12', blocked)).toBe(false);
    });

    it('returns true when request fits in a gap between two blocked ranges', () => {
      const blocked = [
        makeDateRange('2025-09-01', '2025-09-05'),
        makeDateRange('2025-09-10', '2025-09-15'),
      ];
      expect(isDateRangeAvailable('2025-09-05', '2025-09-10', blocked)).toBe(true);
    });
  });
});

describe('getUnavailableDates', () => {
  it('returns empty array for no ranges', () => {
    expect(getUnavailableDates([])).toEqual([]);
  });

  it('returns all dates in range (exclusive end)', () => {
    const ranges = [makeDateRange('2025-09-01', '2025-09-04')];
    const dates = getUnavailableDates(ranges);
    expect(dates).toContain('2025-09-01');
    expect(dates).toContain('2025-09-02');
    expect(dates).toContain('2025-09-03');
    expect(dates).not.toContain('2025-09-04'); // end is exclusive
    expect(dates).toHaveLength(3);
  });

  it('deduplicates dates that appear in overlapping ranges', () => {
    const ranges = [
      makeDateRange('2025-09-01', '2025-09-04'),
      makeDateRange('2025-09-02', '2025-09-05'),
    ];
    const dates = getUnavailableDates(ranges);
    // 01, 02, 03, 04 — each once
    const unique = new Set(dates);
    expect(unique.size).toBe(dates.length);
    expect(dates).toHaveLength(4);
  });

  it('handles a single-day block (start === day before end)', () => {
    const ranges = [makeDateRange('2025-09-15', '2025-09-16')];
    expect(getUnavailableDates(ranges)).toEqual(['2025-09-15']);
  });

  it('handles multiple non-overlapping ranges', () => {
    const ranges = [
      makeDateRange('2025-09-01', '2025-09-03'),
      makeDateRange('2025-09-10', '2025-09-12'),
    ];
    const dates = getUnavailableDates(ranges);
    expect(dates).toHaveLength(4); // 01,02 + 10,11
    expect(dates).toContain('2025-09-01');
    expect(dates).toContain('2025-09-11');
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2025-09-01', 7)).toBe('2025-09-08');
  });

  it('adds zero days', () => {
    expect(addDays('2025-09-01', 0)).toBe('2025-09-01');
  });

  it('crosses month boundaries', () => {
    expect(addDays('2025-01-29', 3)).toBe('2025-02-01');
  });

  it('crosses year boundaries', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('handles negative days (subtracts)', () => {
    expect(addDays('2025-09-08', -7)).toBe('2025-09-01');
  });
});

describe('toDateString', () => {
  it('converts a Date to YYYY-MM-DD format', () => {
    expect(toDateString(new Date('2025-09-15T00:00:00Z'))).toBe('2025-09-15');
  });

  it('returns the date portion only (no time)', () => {
    const result = toDateString(new Date('2025-01-01T23:59:59Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
