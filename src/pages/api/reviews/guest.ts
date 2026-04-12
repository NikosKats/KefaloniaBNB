import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json().catch(() => null);
  const token  = body?.review_token as string | undefined;
  const rating = Number(body?.rating);
  const reviewBody = (body?.body as string | undefined)?.trim() ?? '';

  if (!token) {
    return new Response(JSON.stringify({ error: 'missing_token' }), { status: 400 });
  }

  if (!rating || rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: 'invalid_rating' }), { status: 400 });
  }

  const sb = locals.supabaseService ?? locals.supabase;

  // Look up booking by review_token
  const { data: booking, error: fetchErr } = await sb
    .from('bookings')
    .select('id, status, guest_name, listing_id')
    .eq('review_token', token)
    .single();

  if (fetchErr || !booking) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }

  // Only allow review after checkout (confirmed or completed status)
  const reviewable = ['confirmed', 'completed', 'checked_out'].includes(booking.status);
  if (!reviewable) {
    return new Response(JSON.stringify({ error: 'not_reviewable' }), { status: 409 });
  }

  // Check if review already submitted for this booking
  const { data: existing } = await sb
    .from('reviews')
    .select('id')
    .eq('booking_id', booking.id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: 'already_reviewed' }), { status: 409 });
  }

  // Insert review — is_published defaults to false, awaiting admin approval
  const { error: insertErr } = await sb
    .from('reviews')
    .insert({
      listing_id:   booking.listing_id,
      booking_id:   booking.id,
      guest_name:   booking.guest_name,
      rating,
      body:         reviewBody || null,
      is_published: false,
      is_verified:  true,
    });

  if (insertErr) {
    console.error('guest review insert error:', insertErr.message);
    return new Response(JSON.stringify({ error: 'insert_failed' }), { status: 500 });
  }

  // Invalidate the review_token so it can't be reused (set to a new UUID)
  await sb
    .from('bookings')
    .update({ review_token: crypto.randomUUID() })
    .eq('id', booking.id);

  return new Response(JSON.stringify({ ok: true }), { status: 201 });
};
