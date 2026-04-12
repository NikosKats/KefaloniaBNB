import type { DateRange } from '../types/index.ts';

export function isDateRangeAvailable(
  checkIn: string,
  checkOut: string,
  unavailableRanges: DateRange[]
): boolean {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  return !unavailableRanges.some((range) => {
    const rStart = new Date(range.start).getTime();
    const rEnd = new Date(range.end).getTime();
    return start < rEnd && end > rStart;
  });
}

export function getUnavailableDates(unavailableRanges: DateRange[]): string[] {
  const dates: string[] = [];
  for (const range of unavailableRanges) {
    const current = new Date(range.start);
    const end = new Date(range.end);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  }
  return [...new Set(dates)];
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
