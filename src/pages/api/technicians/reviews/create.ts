import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { technician_id, reviewer_name, reviewer_email, rating, body: reviewBody } = body;

  if (!technician_id || !reviewer_name?.trim() || !rating || rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: 'Name, rating (1-5), and technician are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  // Verify technician exists and is active
  const { data: tech } = await service.from('technicians').select('id').eq('id', technician_id).eq('is_active', true).single();
  if (!tech) {
    return new Response(JSON.stringify({ error: 'Technician not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const { data, error } = await service.from('technician_reviews').insert({
    technician_id,
    reviewer_name: reviewer_name.trim(),
    reviewer_email: reviewer_email?.trim() || null,
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    body: reviewBody?.trim() || null,
    is_approved: false,
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ review: data, message: 'Review submitted for approval' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
