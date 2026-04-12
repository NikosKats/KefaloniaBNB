import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

export const GET: APIRoute = async ({ url }) => {
  const listingId = url.searchParams.get('listing_id');
  if (!listingId) {
    return new Response(JSON.stringify({ error: 'listing_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  const [bookingsRes, blockedRes] = await Promise.all([
    service.from('bookings')
      .select('check_in,check_out')
      .eq('listing_id', listingId)
      .in('status', ['pending','confirmed']),
    service.from('blocked_dates')
      .select('start_date,end_date')
      .eq('listing_id', listingId),
  ]);

  const ranges = [
    ...(bookingsRes.data ?? []).map((b) => ({ start: b.check_in, end: b.check_out })),
    ...(blockedRes.data ?? []).map((b) => ({ start: b.start_date, end: b.end_date })),
  ];

  return new Response(JSON.stringify({ ranges }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
};
