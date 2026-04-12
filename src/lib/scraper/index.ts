import type { ScrapedListing } from './types.ts';
import { scrapeAirbnb } from './airbnb.ts';
import { scrapeBooking } from './booking.ts';

export type { ScrapedListing } from './types.ts';

type Platform = 'airbnb' | 'booking';

export function detectPlatform(url: string): Platform | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('airbnb.')) return 'airbnb';
    if (hostname.includes('booking.com')) return 'booking';
    return null;
  } catch {
    return null;
  }
}

export async function scrapeListing(url: string): Promise<ScrapedListing> {
  const platform = detectPlatform(url);
  if (!platform) throw new Error('Unsupported platform. Please use an Airbnb or Booking.com URL.');

  if (platform === 'airbnb') return scrapeAirbnb(url);
  return scrapeBooking(url);
}
