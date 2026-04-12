import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';

async function getTableRestaurantId(service: any, tableId: string): Promise<string | null> {
  const { data } = await service.from('restaurant_tables').select('restaurant_id').eq('id', tableId).single();
  return data?.restaurant_id ?? null;
}

function isAllowed(locals: any, restaurantId: string): boolean {
  const role = locals.profile?.role;
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'restaurant_owner') return (locals.ownerRestaurantIds ?? []).includes(restaurantId);
  return false;
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const restaurantId = await getTableRestaurantId(service, params.id!);
  if (!restaurantId || !isAllowed(locals, restaurantId)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const fields = ['name', 'capacity', 'location', 'sort_order', 'is_active'];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  const { data, error } = await service.from('restaurant_tables').update(updates).eq('id', params.id).select().single();
  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ table: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const restaurantId = await getTableRestaurantId(service, params.id!);
  if (!restaurantId || !isAllowed(locals, restaurantId)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const { error } = await service.from('restaurant_tables').delete().eq('id', params.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
