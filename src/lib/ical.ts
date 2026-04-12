import type { Booking, BlockedDate } from '../types/index.ts';

function formatICalDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICalFeed(
  listingTitle: string,
  bookings: Pick<Booking, 'id' | 'check_in' | 'check_out' | 'guest_name' | 'status'>[],
  blockedDates: Pick<BlockedDate, 'id' | 'start_date' | 'end_date' | 'reason'>[],
  siteUrl: string
): string {
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  const events: string[] = [];

  for (const booking of bookings) {
    if (!['confirmed', 'pending'].includes(booking.status)) continue;
    events.push([
      'BEGIN:VEVENT',
      `UID:booking-${booking.id}@${new URL(siteUrl).hostname}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatICalDate(booking.check_in)}`,
      `DTEND;VALUE=DATE:${formatICalDate(booking.check_out)}`,
      `SUMMARY:${escapeICalText(`Reserved – ${listingTitle}`)}`,
      `DESCRIPTION:${escapeICalText(`Guest: ${booking.guest_name}`)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n'));
  }

  for (const block of blockedDates) {
    events.push([
      'BEGIN:VEVENT',
      `UID:blocked-${block.id}@${new URL(siteUrl).hostname}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatICalDate(block.start_date)}`,
      `DTEND;VALUE=DATE:${formatICalDate(block.end_date)}`,
      `SUMMARY:${escapeICalText(block.reason ?? 'Blocked')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n'));
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${new URL(siteUrl).hostname}//Direct Booking//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(listingTitle)}`,
    'X-WR-TIMEZONE:Europe/Athens',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

interface ParsedICalEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
}

export function parseICalFeed(icalText: string): ParsedICalEvent[] {
  const events: ParsedICalEvent[] = [];
  const eventBlocks = icalText.split('BEGIN:VEVENT').slice(1);

  for (const block of eventBlocks) {
    const uid     = (block.match(/^UID:(.+)$/m) ?? [])[1]?.trim() ?? '';
    const dtStart = (block.match(/^DTSTART[^:]*:(\d{8})/m) ?? [])[1] ?? '';
    const dtEnd   = (block.match(/^DTEND[^:]*:(\d{8})/m) ?? [])[1] ?? '';
    const summary = (block.match(/^SUMMARY:(.+)$/m) ?? [])[1]?.trim() ?? 'Blocked';

    if (dtStart && dtEnd) {
      events.push({
        uid,
        start: `${dtStart.slice(0,4)}-${dtStart.slice(4,6)}-${dtStart.slice(6,8)}`,
        end:   `${dtEnd.slice(0,4)}-${dtEnd.slice(4,6)}-${dtEnd.slice(6,8)}`,
        summary: summary.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';'),
      });
    }
  }
  return events;
}
