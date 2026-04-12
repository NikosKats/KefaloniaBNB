import type { ScrapedListing } from './types.ts';

/**
 * Scrape a Booking.com property page.
 * Strategy: fetch HTML → extract JSON-LD, meta tags, and structured patterns.
 */
export async function scrapeBooking(url: string): Promise<ScrapedListing> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch Booking.com page: ${res.status}`);
  const html = await res.text();

  const jsonLd = extractJsonLd(html);
  const meta = extractMetaTags(html);
  const details = extractPropertyDetails(html);

  const title = jsonLd?.name || meta.title || 'Untitled';
  const description = jsonLd?.description || meta.description || '';

  // Photos
  let photos: string[] = [];
  if (jsonLd?.image) {
    photos = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
  }
  // Also extract from data-highres or large image patterns
  const imgMatches = html.match(/https:\/\/cf\.bstatic\.com\/xdata\/images\/hotel\/max\d+\/[^"'\s]+/g);
  if (imgMatches?.length) {
    const unique = [...new Set([...photos, ...imgMatches])];
    photos = unique;
  }
  if (!photos.length && meta.image) photos = [meta.image];

  // Location
  const location: ScrapedListing['location'] = {};
  if (jsonLd?.address) {
    location.address = jsonLd.address.streetAddress;
    location.city = jsonLd.address.addressLocality;
  }
  if (jsonLd?.geo) {
    location.lat = parseFloat(jsonLd.geo.latitude);
    location.lng = parseFloat(jsonLd.geo.longitude);
  }
  // Booking.com also has data-lat/data-lng attributes
  const latMatch = html.match(/data-lat="([\d.-]+)"/);
  const lngMatch = html.match(/data-lng="([\d.-]+)"/);
  if (latMatch) location.lat = parseFloat(latMatch[1]);
  if (lngMatch) location.lng = parseFloat(lngMatch[1]);

  return {
    source: 'booking',
    sourceUrl: url,
    title,
    description,
    photos: photos.slice(0, 30),
    location,
    amenities: details.amenities,
    bedrooms: details.bedrooms,
    bathrooms: details.bathrooms,
    maxGuests: details.maxGuests,
    propertyType: details.propertyType,
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
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Hotel' || item['@type'] === 'LodgingBusiness' ||
            item['@type'] === 'VacationRental' || item['@type'] === 'Accommodation' ||
            item['@type'] === 'Apartment' || item['@type'] === 'House' ||
            item['@type'] === 'Product' || item.name) {
          return item;
        }
      }
    } catch { /* skip */ }
  }
  return null;
}

function extractMetaTags(html: string): { title?: string; description?: string; image?: string } {
  const result: { title?: string; description?: string; image?: string } = {};

  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)
    || html.match(/<title>([^<]*)<\/title>/i);
  if (titleMatch) result.title = decodeHtml(titleMatch[1]);

  const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (descMatch) result.description = decodeHtml(descMatch[1]);

  const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
  if (imgMatch) result.image = imgMatch[1];

  return result;
}

function extractPropertyDetails(html: string): {
  amenities: string[];
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  propertyType?: string;
} {
  const amenities: string[] = [];

  // Booking.com uses "facilitiesChecklist" or similar patterns
  // Extract facility names from common patterns
  const facilityMatches = html.match(/data-name-text="([^"]+)"/g);
  if (facilityMatches) {
    for (const m of facilityMatches) {
      const name = m.match(/data-name-text="([^"]+)"/)?.[1];
      if (name) amenities.push(decodeHtml(name));
    }
  }

  // Also try class-based facility extraction
  const facilitySpans = html.match(/<span[^>]*class="[^"]*facility[^"]*"[^>]*>([^<]+)<\/span>/gi);
  if (facilitySpans) {
    for (const span of facilitySpans) {
      const text = span.replace(/<[^>]+>/g, '').trim();
      if (text.length > 2 && text.length < 80 && !amenities.includes(text)) {
        amenities.push(text);
      }
    }
  }

  // Bedrooms/bathrooms from structured text
  let bedrooms: number | undefined;
  let bathrooms: number | undefined;
  let maxGuests: number | undefined;

  const bedroomMatch = html.match(/(\d+)\s*bedroom/i);
  if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1]);

  const bathroomMatch = html.match(/(\d+)\s*bathroom/i);
  if (bathroomMatch) bathrooms = parseInt(bathroomMatch[1]);

  const guestMatch = html.match(/(\d+)\s*guest/i);
  if (guestMatch) maxGuests = parseInt(guestMatch[1]);

  // Property type from breadcrumbs or meta
  let propertyType: string | undefined;
  const typeMatch = html.match(/data-testid="property-type-badge"[^>]*>([^<]+)/);
  if (typeMatch) propertyType = typeMatch[1].trim();

  return { amenities: [...new Set(amenities)], bedrooms, bathrooms, maxGuests, propertyType };
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
