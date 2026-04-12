/**
 * Shared date and currency formatting utilities.
 * Replaces the many inline fmtDate() definitions scattered across the codebase.
 */

/** Long format: "Monday, January 1, 2025" — used in emails */
export function fmtDateLong(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** Short format: "1 Jan 2025" — used in booking pages, admin tables */
export function fmtDateShort(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Telegram format: "Mon, 1 Jan 2025" — used in Telegram notifications */
export function fmtDateTelegram(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Month-year format: "January 2025" — used in review dates */
export function fmtDateMonthYear(d: string, locale = 'en-US'): string {
  return new Date(d).toLocaleDateString(locale, {
    month: 'long', year: 'numeric',
  });
}

/** Blog/content format: "Jan 1, 2025" — used in blog posts */
export function fmtDateMedium(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Generic fmtDate — defaults to short format for backwards compatibility */
export function fmtDate(d: string): string {
  return fmtDateShort(d);
}
