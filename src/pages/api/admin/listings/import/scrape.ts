import type { APIRoute } from 'astro';
import { scrapeListing, detectPlatform } from '../../../../../lib/scraper/index.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { url } = body;
  if (!url || typeof url !== 'string') return json({ error: 'URL is required' }, 400);

  const platform = detectPlatform(url);
  if (!platform) return json({ error: 'Unsupported platform. Use an Airbnb or Booking.com URL.' }, 400);

  try {
    const scraped = await scrapeListing(url);
    return json({ scraped }, 200);
  } catch (err: any) {
    return json({ error: err.message || 'Failed to scrape listing' }, 500);
  }
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
