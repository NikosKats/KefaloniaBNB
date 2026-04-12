import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

function isAllowed(locals: any, restaurantId: string): boolean {
  const role = locals.profile?.role;
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'restaurant_owner') return (locals.ownerRestaurantIds ?? []).includes(restaurantId);
  return false;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const { restaurant_id, name, capacity, location, sort_order, is_active } = body;

  if (!restaurant_id || !name?.trim()) {
    return new Response(JSON.stringify({ error: 'Restaurant and name are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!isAllowed(locals, restaurant_id)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { data, error } = await service.from('restaurant_tables').insert({
    restaurant_id,
    name: name.trim(),
    capacity: capacity ?? 2,
    location: location ?? 'indoor',
    sort_order: sort_order ?? 0,
    is_active: is_active !== false,
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ table: data }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
