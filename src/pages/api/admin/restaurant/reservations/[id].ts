import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { sendReservationConfirmed, sendReservationCancelled } from '../../../../../lib/email.ts';
import { sendGuestNotification } from '../../../../../lib/whatsapp.ts';

async function getReservationRestaurantId(service: any, resId: string): Promise<{ restaurantId: string | null; reservation: any }> {
  const { data } = await service.from('restaurant_reservations').select('*, restaurants(name, slug)').eq('id', resId).single();
  return { restaurantId: data?.restaurant_id ?? null, reservation: data };
}

function isAllowed(locals: any, restaurantId: string): boolean {
  const role = locals.profile?.role;
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'restaurant_owner') return (locals.ownerRestaurantIds ?? []).includes(restaurantId);
  return false;
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) return json('Unauthorized', 401);

  const service = getServiceClient();
  const { restaurantId } = await getReservationRestaurantId(service, params.id!);
  if (!restaurantId || !isAllowed(locals, restaurantId)) return json('Forbidden', 403);

  const { error } = await service.from('restaurant_reservations').delete().eq('id', params.id);
  if (error) return json(error.message, 500);

  return new Response(null, { status: 204 });
};

function json(error: string, status: number) {
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { restaurantId, reservation } = await getReservationRestaurantId(service, params.id!);
  if (!restaurantId || !isAllowed(locals, restaurantId)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(body.status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    updates.status = body.status;
  }
  if (body.table_id !== undefined) updates.table_id = body.table_id || null;
  if (body.notes !== undefined) updates.notes = body.notes;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await service
    .from('restaurant_reservations')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Send email notifications on status change
  if (body.status && reservation?.guest_email) {
    try {
      const restaurant = reservation.restaurants ?? { name: 'Restaurant' };
      if (body.status === 'confirmed') {
        await sendReservationConfirmed(data, restaurant);
      } else if (body.status === 'cancelled') {
        await sendReservationCancelled(data, restaurant);
      }
    } catch {}
  }

  // Send notification via guest's preferred channel (WhatsApp/Viber/Telegram)
  if (body.status === 'confirmed' || body.status === 'cancelled') {
    try {
      const restaurant = reservation.restaurants ?? { name: 'Restaurant' };
      await sendGuestNotification(data, restaurant, body.status);
    } catch {}
  }

  return new Response(JSON.stringify({ reservation: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
