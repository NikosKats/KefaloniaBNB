import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

/**
 * GET /api/cleaning/market-rate?city=Keramoti&bedrooms=3
 *
 * Returns avg, min, max of agreed_price from approved/completed cleaning_jobs
 * for the given city and bedrooms (±1 bedroom tolerance), based on recent jobs.
 */
export const GET: APIRoute = async ({ url }) => {
  const city = url.searchParams.get('city');
  const bedrooms = parseInt(url.searchParams.get('bedrooms') ?? '0', 10);

  if (!city) {
    return new Response(JSON.stringify({ error: 'city required' }), { status: 400 });
  }

  const service = getServiceClient();

  // Join jobs → listings to filter by city and bedrooms
  const { data: jobs } = await service
    .from('cleaning_jobs')
    .select('agreed_price, listings(city, bedrooms)')
    .in('status', ['approved', 'completed'])
    .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()); // last 6 months

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ avg: null, min: null, max: null, count: 0 }), { status: 200 });
  }

  // Filter in-process (Supabase can't filter on joined columns in .select)
  const filtered = jobs.filter((j: any) => {
    const l = j.listings;
    if (!l) return false;
    const cityMatch = l.city?.toLowerCase() === city.toLowerCase();
    const bedsMatch = Math.abs((l.bedrooms ?? 0) - bedrooms) <= 1;
    return cityMatch && bedsMatch;
  });

  if (filtered.length === 0) {
    return new Response(JSON.stringify({ avg: null, min: null, max: null, count: 0 }), { status: 200 });
  }

  const prices = filtered.map((j: any) => parseFloat(j.agreed_price));
  const avg = parseFloat((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2));
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return new Response(JSON.stringify({ avg, min, max, count: filtered.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
