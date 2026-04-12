import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendCheckinInstructions } from '../../../lib/email.ts';

/**
 * GET /api/cron/checkin-reminder
 *
 * Finds confirmed, paid bookings whose check-in is exactly 48 hours away
 * and sends each guest a pre-arrival email with check-in instructions.
 *
 * Protected by CRON_SECRET env var — called daily by GitHub Actions (or any scheduler).
 * Add to your .env: CRON_SECRET=some-long-random-string
 */
export const GET: APIRoute = async ({ request }) => {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const secret = import.meta.env.CRON_SECRET;
  const incoming = request.headers.get('x-cron-secret');
  if (!secret || incoming !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const service = getServiceClient();

  // ── Find bookings checking in ~48 h from now ────────────────────────────
  // We query a 24-hour window centred on "now + 2 days" to tolerate drift
  // when the cron runs slightly early/late.
  const now = new Date();
  const windowStart = new Date(now.getTime() + 40 * 60 * 60 * 1000); // +40 h
  const windowEnd   = new Date(now.getTime() + 56 * 60 * 60 * 1000); // +56 h

  const startDate = windowStart.toISOString().slice(0, 10); // YYYY-MM-DD
  const endDate   = windowEnd.toISOString().slice(0, 10);

  const { data: bookings, error } = await service
    .from('bookings')
    .select('*, listings(title, slug, city, address, country, check_in_time, check_out_time, house_rules, checkin_instructions)')
    .in('status', ['confirmed'])
    .eq('payment_status', 'paid')
    .gte('check_in', startDate)
    .lte('check_in', endDate)
    .is('checkin_reminder_sent_at', null);

  if (error) {
    console.error('checkin-reminder: DB query failed', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results: { id: string; email: string; status: 'sent' | 'failed' }[] = [];

  for (const booking of bookings ?? []) {
    const listing = (booking as any).listings;
    if (!listing) continue;

    try {
      await sendCheckinInstructions(booking, listing);

      // Mark sent so we never double-email
      await service
        .from('bookings')
        .update({ checkin_reminder_sent_at: new Date().toISOString() })
        .eq('id', booking.id);

      results.push({ id: booking.id, email: booking.guest_email, status: 'sent' });
    } catch (err) {
      console.error(`checkin-reminder: failed for booking ${booking.id}`, err);
      results.push({ id: booking.id, email: booking.guest_email, status: 'failed' });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
