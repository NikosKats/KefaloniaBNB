import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { generateICalFeed } from '../../../../lib/ical.ts';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  const service = getServiceClient();

  const [listingRes, bookingsRes, blockedRes] = await Promise.all([
    service.from('listings').select('title').eq('id', id).single(),
    service.from('bookings').select('id,check_in,check_out,guest_name,status').eq('listing_id', id).in('status', ['confirmed','pending']),
    service.from('blocked_dates').select('id,start_date,end_date,reason').eq('listing_id', id),
  ]);

  if (!listingRes.data) return new Response('Not Found', { status: 404 });

  const feed = generateICalFeed(
    listingRes.data.title,
    bookingsRes.data ?? [],
    blockedRes.data ?? [],
    import.meta.env.PUBLIC_SITE_URL ?? 'https://kefaloniabnb.com'
  );

  return new Response(feed, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${id}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
};
