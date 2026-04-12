import { describe, it, expect } from 'vitest';
import { generateICalFeed, parseICalFeed } from '../../src/lib/ical.ts';
import { makeBooking } from '../fixtures/factories.ts';
import type { BlockedDate } from '../../src/types/index.ts';

const SITE = 'https://kefaloniabnb.com';
const HOSTNAME = 'kefaloniabnb.com';
const TITLE = 'Villa Thalassa';

function makeBlock(overrides: Partial<BlockedDate> = {}): BlockedDate {
  return {
    id:         'block-uuid-1',
    listing_id: 'listing-uuid-1',
    start_date: '2025-09-10',
    end_date:   '2025-09-15',
    reason:     'Maintenance',
    source:     'manual',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── generateICalFeed ──────────────────────────────────────────────────────────
describe('generateICalFeed', () => {
  describe('RFC 5545 structure', () => {
    it('starts with BEGIN:VCALENDAR and ends with END:VCALENDAR', () => {
      const feed = generateICalFeed(TITLE, [], [], SITE);
      expect(feed.startsWith('BEGIN:VCALENDAR')).toBe(true);
      expect(feed.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    });

    it('includes VERSION:2.0', () => {
      expect(generateICalFeed(TITLE, [], [], SITE)).toContain('VERSION:2.0');
    });

    it('includes PRODID with hostname', () => {
      expect(generateICalFeed(TITLE, [], [], SITE)).toContain(HOSTNAME);
    });

    it('includes CALSCALE:GREGORIAN', () => {
      expect(generateICalFeed(TITLE, [], [], SITE)).toContain('CALSCALE:GREGORIAN');
    });

    it('uses CRLF line endings', () => {
      const feed = generateICalFeed(TITLE, [], [], SITE);
      expect(feed).toContain('\r\n');
    });
  });

  describe('bookings', () => {
    it('includes a VEVENT for confirmed bookings', () => {
      const booking = makeBooking({ status: 'confirmed', check_in: '2025-09-01', check_out: '2025-09-08' });
      const feed = generateICalFeed(TITLE, [booking], [], SITE);
      expect(feed).toContain('BEGIN:VEVENT');
      expect(feed).toContain('END:VEVENT');
      expect(feed).toContain(`UID:booking-${booking.id}@${HOSTNAME}`);
      expect(feed).toContain('DTSTART;VALUE=DATE:20250901');
      expect(feed).toContain('DTEND;VALUE=DATE:20250908');
    });

    it('includes a VEVENT for pending bookings', () => {
      const booking = makeBooking({ status: 'pending' });
      const feed = generateICalFeed(TITLE, [booking], [], SITE);
      expect(feed).toContain('BEGIN:VEVENT');
    });

    it('excludes cancelled bookings', () => {
      const booking = makeBooking({ status: 'cancelled' });
      const feed = generateICalFeed(TITLE, [booking], [], SITE);
      expect(feed).not.toContain('BEGIN:VEVENT');
    });

    it('excludes completed bookings', () => {
      const booking = makeBooking({ status: 'completed' });
      const feed = generateICalFeed(TITLE, [booking], [], SITE);
      expect(feed).not.toContain('BEGIN:VEVENT');
    });

    it('includes guest name in DESCRIPTION', () => {
      const booking = makeBooking({ guest_name: 'Alice Smith', status: 'confirmed' });
      const feed = generateICalFeed(TITLE, [booking], [], SITE);
      expect(feed).toContain('Alice Smith');
    });

    it('includes SUMMARY with listing title', () => {
      const booking = makeBooking({ status: 'confirmed' });
      const feed = generateICalFeed(TITLE, [booking], [], SITE);
      expect(feed).toContain(TITLE);
    });

    it('generates one VEVENT per booking', () => {
      const bookings = [
        makeBooking({ id: 'id-1', status: 'confirmed', check_in: '2025-09-01', check_out: '2025-09-05' }),
        makeBooking({ id: 'id-2', status: 'confirmed', check_in: '2025-09-10', check_out: '2025-09-15' }),
      ];
      const feed = generateICalFeed(TITLE, bookings, [], SITE);
      const count = (feed.match(/BEGIN:VEVENT/g) ?? []).length;
      expect(count).toBe(2);
    });
  });

  describe('blocked dates', () => {
    it('includes a VEVENT for blocked dates', () => {
      const block = makeBlock();
      const feed = generateICalFeed(TITLE, [], [block], SITE);
      expect(feed).toContain(`UID:blocked-${block.id}@${HOSTNAME}`);
      expect(feed).toContain('DTSTART;VALUE=DATE:20250910');
      expect(feed).toContain('DTEND;VALUE=DATE:20250915');
    });

    it('uses the block reason as SUMMARY', () => {
      const block = makeBlock({ reason: 'Owner stay' });
      const feed = generateICalFeed(TITLE, [], [block], SITE);
      expect(feed).toContain('Owner stay');
    });

    it('falls back to "Blocked" when reason is null', () => {
      const block = makeBlock({ reason: undefined });
      const feed = generateICalFeed(TITLE, [], [block], SITE);
      expect(feed).toContain('SUMMARY:Blocked');
    });
  });

  describe('special character escaping', () => {
    it('escapes semicolons in listing title', () => {
      const feed = generateICalFeed('Villa; Test', [], [], SITE);
      expect(feed).toContain('Villa\\; Test');
    });

    it('escapes commas in listing title', () => {
      const feed = generateICalFeed('Villa, Test', [], [], SITE);
      expect(feed).toContain('Villa\\, Test');
    });
  });
});

// ─── parseICalFeed ─────────────────────────────────────────────────────────────
describe('parseICalFeed', () => {
  const SAMPLE_ICAL = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:booking-abc@kefaloniabnb.com',
    'DTSTART;VALUE=DATE:20250901',
    'DTEND;VALUE=DATE:20250908',
    'SUMMARY:Reserved – Villa Thalassa',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  it('returns an array of parsed events', () => {
    const events = parseICalFeed(SAMPLE_ICAL);
    expect(events).toHaveLength(1);
  });

  it('parses UID correctly', () => {
    const [event] = parseICalFeed(SAMPLE_ICAL);
    expect(event.uid).toBe('booking-abc@kefaloniabnb.com');
  });

  it('parses start date in YYYY-MM-DD format', () => {
    const [event] = parseICalFeed(SAMPLE_ICAL);
    expect(event.start).toBe('2025-09-01');
  });

  it('parses end date in YYYY-MM-DD format', () => {
    const [event] = parseICalFeed(SAMPLE_ICAL);
    expect(event.end).toBe('2025-09-08');
  });

  it('parses summary', () => {
    const [event] = parseICalFeed(SAMPLE_ICAL);
    expect(event.summary).toBe('Reserved – Villa Thalassa');
  });

  it('returns empty array for feed with no events', () => {
    const empty = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
    expect(parseICalFeed(empty)).toEqual([]);
  });

  it('round-trips: generate then parse', () => {
    const booking = makeBooking({
      id:         'round-trip-id',
      status:     'confirmed',
      check_in:   '2025-10-01',
      check_out:  '2025-10-07',
      guest_name: 'Test Guest',
    });
    const feed = generateICalFeed(TITLE, [booking], [], SITE);
    const events = parseICalFeed(feed);
    expect(events).toHaveLength(1);
    expect(events[0].start).toBe('2025-10-01');
    expect(events[0].end).toBe('2025-10-07');
    expect(events[0].uid).toBe(`booking-round-trip-id@${HOSTNAME}`);
  });

  it('parses multiple events', () => {
    const twoEvents = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:evt-1',
      'DTSTART;VALUE=DATE:20250901',
      'DTEND;VALUE=DATE:20250905',
      'SUMMARY:First',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:evt-2',
      'DTSTART;VALUE=DATE:20250910',
      'DTEND;VALUE=DATE:20250915',
      'SUMMARY:Second',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(parseICalFeed(twoEvents)).toHaveLength(2);
  });
});
