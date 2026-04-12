import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendReviewRequest } from '../../../lib/email.ts';

/**
 * GET /api/cron/review-request
 *
 * Runs daily. Finds bookings whose check-out date is today and sends each
 * guest a review-request email with their unique review link.
 *
 * Protected by CRON_SECRET env var.
 */
export const GET: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET;
  const incoming = request.headers.get('x-cron-secret');
  if (!secret || incoming !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const service = getServiceClient();

  // Today's date in local-equivalent UTC (cron runs at a fixed UTC time;
  // using UTC date is fine since check_out is stored as a date string).
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings, error } = await service
    .from('bookings')
    .select('*, listings(id, title, check_in_time, check_out_time, listing_images(url, is_cover))')
    .in('status', ['confirmed', 'checked_out', 'completed'])
    .eq('check_out', today)
    .is('review_request_sent_at', null);

  if (error) {
    console.error('review-request: DB query failed', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results: { id: string; email: string; status: 'sent' | 'failed' }[] = [];

  for (const booking of bookings ?? []) {
    const listing = (booking as any).listings;
    if (!listing || !booking.review_token) continue;
    listing.cover_image = (listing.listing_images?.find((i: any) => i.is_cover) ?? listing.listing_images?.[0])?.url ?? null;

    try {
      await sendReviewRequest(booking, listing, booking.review_token);

      await service
        .from('bookings')
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq('id', booking.id);

      results.push({ id: booking.id, email: booking.guest_email, status: 'sent' });
    } catch (err) {
      console.error(`review-request: failed for booking ${booking.id}`, err);
      results.push({ id: booking.id, email: booking.guest_email, status: 'failed' });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
