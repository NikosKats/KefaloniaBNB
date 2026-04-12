import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const role = locals.profile?.role;
  const body = await request.json();
  const { restaurant_id } = body;

  if (!restaurant_id) {
    return new Response(JSON.stringify({ error: 'Restaurant ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Check ownership
  if (role === 'restaurant_owner' && !(locals.ownerRestaurantIds ?? []).includes(restaurant_id)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  if (role !== 'admin' && role !== 'super_admin' && role !== 'restaurant_owner') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const updates: Record<string, unknown> = {};
  const fields = ['accepts_reservations', 'reservation_slot_minutes', 'reservation_max_advance_days', 'reservation_min_hours_ahead', 'telegram_chat_id', 'opening_hours_reservation'];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  updates.updated_at = new Date().toISOString();

  const service = getServiceClient();
  const { data, error } = await service
    .from('restaurants')
    .update(updates)
    .eq('id', restaurant_id)
    .select()
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ restaurant: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
