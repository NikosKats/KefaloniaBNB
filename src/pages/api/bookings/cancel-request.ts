import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json().catch(() => null);
  const token = body?.guest_token as string | undefined;
  const reason = (body?.reason as string | undefined) ?? '';

  if (!token) {
    return new Response(JSON.stringify({ error: 'missing_token' }), { status: 400 });
  }

  const sb = getServiceClient();

  // Look up booking by guest_token
  const { data: booking, error: fetchErr } = await sb
    .from('bookings')
    .select('id, status, guest_name, guest_email')
    .eq('guest_token', token)
    .single();

  if (fetchErr || !booking) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }

  const cancellable = ['pending', 'confirmed'].includes(booking.status);
  if (!cancellable) {
    return new Response(JSON.stringify({ error: 'not_cancellable', status: booking.status }), { status: 409 });
  }

  // Mark the booking with a cancellation_requested flag
  // We add it as a note in cancel_reason and set status to cancel_requested (or keep as is and just flag)
  const { error: updateErr } = await sb
    .from('bookings')
    .update({
      cancel_requested: true,
      cancel_request_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (updateErr) {
    // If the columns don't exist yet (old schema), fall back gracefully
    console.error('cancel-request update error:', updateErr.message);
    return new Response(JSON.stringify({ error: 'update_failed' }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
