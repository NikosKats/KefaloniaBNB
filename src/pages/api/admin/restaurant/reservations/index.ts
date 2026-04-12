import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const role = (locals.profile as any)?.role;
  const ownerIds = (locals as any).ownerRestaurantIds ?? [];

  const body = await request.json();
  const { restaurant_id, date, time_slot, guest_count, guest_name, guest_email, guest_phone, special_requests, contact_preference, status } = body;

  if (!restaurant_id || !date || !time_slot || !guest_count || !guest_name?.trim()) {
    return new Response(JSON.stringify({ error: 'Name, date, time, and party size are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Permission check
  const isAdmin = role === 'admin' || role === 'super_admin';
  if (!isAdmin && !ownerIds.includes(restaurant_id)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const count = parseInt(guest_count);
  if (isNaN(count) || count < 1 || count > 50) {
    return new Response(JSON.stringify({ error: 'Invalid party size' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  const { data: reservation, error } = await service.from('restaurant_reservations').insert({
    restaurant_id,
    guest_name: guest_name.trim(),
    guest_email: guest_email?.trim() || null,
    guest_phone: guest_phone?.trim() || null,
    guest_count: count,
    date,
    time_slot,
    special_requests: special_requests?.trim() || null,
    contact_preference: contact_preference || 'whatsapp',
    status: status || 'confirmed',
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ reservation }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
