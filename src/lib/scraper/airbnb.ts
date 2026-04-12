import type { ScrapedListing } from './types.ts';

/**
 * Scrape an Airbnb listing page.
 * Strategy: fetch HTML → extract JSON-LD and deferred-state data.
 */
export async function scrapeAirbnb(url: string): Promise<ScrapedListing> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch Airbnb page: ${res.status}`);
  const html = await res.text();

  // 1. Try JSON-LD
  const jsonLd = extractJsonLd(html);

  // 2. Try deferred state for richer data
  const deferred = extractDeferredState(html);

  // 3. Fallback to meta tags
  const meta = extractMetaTags(html);

  const title = deferred?.title || jsonLd?.name || meta.title || 'Untitled';
  const description = deferred?.description || jsonLd?.description || meta.description || '';

  // Photos
  let photos: string[] = [];
  if (deferred?.photos?.length) {
    photos = deferred.photos;
  } else if (jsonLd?.image) {
    photos = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
  } else if (meta.image) {
    photos = [meta.image];
  }

  // Location
  const location: ScrapedListing['location'] = {};
  if (jsonLd?.address) {
    location.address = typeof jsonLd.address === 'string'
      ? jsonLd.address
      : jsonLd.address.streetAddress || jsonLd.address.addressLocality || '';
    location.city = jsonLd.address.addressLocality;
  }
  if (jsonLd?.geo) {
    location.lat = parseFloat(jsonLd.geo.latitude);
    location.lng = parseFloat(jsonLd.geo.longitude);
  }
  if (deferred?.lat) location.lat = deferred.lat;
  if (deferred?.lng) location.lng = deferred.lng;
  if (deferred?.city) location.city = deferred.city;

  return {
    source: 'airbnb',
    sourceUrl: url,
    title,
    description,
    photos: photos.slice(0, 30),
    location,
    amenities: deferred?.amenities ?? [],
    bedrooms: deferred?.bedrooms ?? undefined,
    bathrooms: deferred?.bathrooms ?? undefined,
    maxGuests: deferred?.maxGuests ?? undefined,
    propertyType: deferred?.propertyType ?? undefined,
    rating: jsonLd?.aggregateRating?.ratingValue ? parseFloat(jsonLd.aggregateRating.ratingValue) : undefined,
    reviewCount: jsonLd?.aggregateRating?.reviewCount ? parseInt(jsonLd.aggregateRating.reviewCount) : undefined,
  };
}

function extractJsonLd(html: string): any | null {
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Could be an array or single object
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'LodgingBusiness' || item['@type'] === 'VacationRental' ||
            item['@type'] === 'Accommodation' || item['@type'] === 'House' ||
            item['@type'] === 'Apartment' || item.name) {
          return item;
        }
      }
    } catch { /* skip invalid JSON */ }
  }
  return null;
}

function extractDeferredState(html: string): {
  title?: string;
  description?: string;
  photos?: string[];
  amenities?: string[];
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  propertyType?: string;
  lat?: number;
  lng?: number;
  city?: string;
} | null {
  // Airbnb embeds data in deferred state scripts
  const deferredMatch = html.match(/<script\s+id="data-deferred-state-0"[^>]*>([\s\S]*?)<\/script>/);
  if (!deferredMatch) return null;

  try {
    const data = JSON.parse(deferredMatch[1]);
    return parseDeferredData(data);
  } catch {
    return null;
  }
}

function parseDeferredData(data: any): ReturnType<typeof extractDeferredState> {
  const result: NonNullable<ReturnType<typeof extractDeferredState>> = {};

  // Recursively search for listing data in the deferred state tree
  const str = JSON.stringify(data);

  // Photos — look for large photo URLs
  const photoMatches = str.match(/https:\/\/a0\.muscache\.com\/im\/pictures\/[^"\\]+/g);
  if (photoMatches?.length) {
    result.photos = [...new Set(photoMatches)].slice(0, 30);
  }

  // Walk the tree for structured data
  walkObject(data, (key, value) => {
    if (key === 'title' && typeof value === 'string' && value.length > 5 && !result.title) {
      result.title = value;
    }
    if ((key === 'description' || key === 'htmlDescription') && typeof value === 'string' && value.length > 20 && !result.description) {
      result.description = value.replace(/<[^>]+>/g, '');
    }
    if (key === 'personCapacity' && typeof value === 'number') result.maxGuests = value;
    if (key === 'bedrooms' && typeof value === 'number') result.bedrooms = value;
    if (key === 'bathrooms' && typeof value === 'number') result.bathrooms = value;
    if (key === 'roomType' && typeof value === 'string') result.propertyType = value;
    if (key === 'lat' && typeof value === 'number' && Math.abs(value) > 1) result.lat = value;
    if (key === 'lng' && typeof value === 'number' && Math.abs(value) > 1) result.lng = value;
    if (key === 'city' && typeof value === 'string' && !result.city) result.city = value;

    // Amenities array
    if (key === 'amenities' && Array.isArray(value)) {
      const names = value
        .map((a: any) => (typeof a === 'string' ? a : a?.title || a?.name || ''))
        .filter(Boolean);
      if (names.length > result.amenities!.length) result.amenities = names;
    }
  });

  if (!result.amenities) result.amenities = [];
  return result;
}

function walkObject(obj: any, cb: (key: string, value: any) => void, depth = 0): void {
  if (depth > 15 || !obj || typeof obj !== 'object') return;
  for (const [key, value] of Object.entries(obj)) {
    cb(key, value);
    if (typeof value === 'object' && value !== null) {
      walkObject(value, cb, depth + 1);
    }
  }
}

function extractMetaTags(html: string): { title?: string; description?: string; image?: string } {
  const result: { title?: string; description?: string; image?: string } = {};

  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)
    || html.match(/<title>([^<]*)<\/title>/i);
  if (titleMatch) result.title = decodeHtmlEntities(titleMatch[1]);

  const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (descMatch) result.description = decodeHtmlEntities(descMatch[1]);

  const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
  if (imgMatch) result.image = imgMatch[1];

  return result;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
