import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendVerificationEmail } from '../../../lib/email.ts';

/**
 * POST /api/bookings/resend-verification
 * Resends the email verification for an unverified booking.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { bookingId } = body;
  if (!bookingId) return json({ error: 'bookingId required' }, 400);

  const service = getServiceClient();

  const { data: booking } = await service
    .from('bookings')
    .select('id, guest_email, guest_name, email_verified, email_verification_token, email_verification_expires_at, listing_id')
    .eq('id', bookingId)
    .single();

  if (!booking) return json({ error: 'Booking not found' }, 404);
  if (booking.email_verified) return json({ error: 'Already verified' }, 400);

  // Refresh the expiry
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await service.from('bookings').update({ email_verification_expires_at: newExpiry }).eq('id', booking.id);

  // Fetch listing for email template
  const { data: listing } = await service
    .from('listings')
    .select('title, check_in_time, check_out_time')
    .eq('id', booking.listing_id)
    .single();

  if (listing && booking.email_verification_token) {
    await sendVerificationEmail(booking as any, listing, booking.email_verification_token);
  }

  return json({ ok: true }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
