import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const listing_id = body.listing_id as string | undefined;
  const guest_name = (body.guest_name as string | undefined)?.trim();
  const rating = Number(body.rating);
  const reviewBody = (body.body as string | undefined)?.trim() ?? '';

  if (!listing_id || !guest_name) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!rating || rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: 'invalid_rating' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  // Verify listing exists
  const { data: listing } = await service.from('listings').select('id').eq('id', listing_id).single();
  if (!listing) {
    return new Response(JSON.stringify({ error: 'listing_not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const { error: insertErr } = await service
    .from('reviews')
    .insert({
      listing_id,
      guest_name,
      rating,
      body: reviewBody || null,
      is_published: false,
      is_verified: false,
      source: 'direct',
    });

  if (insertErr) {
    console.error('public review insert error:', insertErr.message);
    return new Response(JSON.stringify({ error: 'insert_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
