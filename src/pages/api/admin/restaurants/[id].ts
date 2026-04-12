import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (!['admin', 'super_admin', 'restaurant_owner'].includes(role ?? '')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // Restaurant owners can only update their own restaurants
  if (role === 'restaurant_owner') {
    const ownerIds = locals.ownerRestaurantIds ?? [];
    if (!ownerIds.includes(params.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const fields = ['name', 'description', 'description_el', 'cuisine_type', 'address', 'city', 'phone', 'website', 'google_maps_url', 'latitude', 'longitude', 'cover_photo', 'photo_urls', 'price_range', 'features', 'opening_hours', 'is_active', 'is_partner', 'tripadvisor_url', 'google_business_url', 'facebook_url', 'instagram_url', 'owner_id', 'accepts_reservations', 'reservation_slot_minutes', 'reservation_max_advance_days', 'reservation_min_hours_ahead', 'telegram_chat_id', 'opening_hours_reservation', 'google_place_id'];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  if (body.name) {
    updates.slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  updates.updated_at = new Date().toISOString();
  const service = getServiceClient();
  const { data, error } = await service.from('restaurants').update(updates).eq('id', params.id).select().single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ restaurant: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { error } = await service.from('restaurants').delete().eq('id', params.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
