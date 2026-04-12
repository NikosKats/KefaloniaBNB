import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

/**
 * GET /api/cron/cleanup-unverified
 * Cancels bookings where email was not verified within 24 hours.
 * Called by Cloudflare cron trigger or GitHub Actions.
 */
export const GET: APIRoute = async ({ request }) => {
  // Optional: verify cron secret
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret) {
    const auth = new URL(request.url).searchParams.get('secret');
    if (auth !== cronSecret) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const service = getServiceClient();

  // Find unverified bookings past their expiry
  const { data: expired, error } = await service
    .from('bookings')
    .select('id, guest_email, guest_name, listing_id')
    .eq('email_verified', false)
    .lt('email_verification_expires_at', new Date().toISOString())
    .not('status', 'eq', 'cancelled');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  if (!expired?.length) {
    return new Response(JSON.stringify({ cancelled: 0, message: 'No expired unverified bookings' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cancel them
  const ids = expired.map(b => b.id);
  const { error: updateErr } = await service
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: 'Email not verified within 24 hours',
    })
    .in('id', ids);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ cancelled: ids.length, ids }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
