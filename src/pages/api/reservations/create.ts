import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendReservationAlert } from '../../../lib/telegram.ts';
import { sendReservationReceived } from '../../../lib/email.ts';
import { sendGuestNotification } from '../../../lib/whatsapp.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { restaurant_id, date, time_slot, guest_count, guest_name, guest_email, guest_phone, special_requests, contact_preference } = body;

  if (!restaurant_id || !date || !time_slot || !guest_count || !guest_name?.trim() || !guest_phone?.trim()) {
    return new Response(JSON.stringify({ error: 'Name, phone, date, time, and party size are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validate time format
  if (!/^\d{2}:\d{2}$/.test(time_slot)) {
    return new Response(JSON.stringify({ error: 'Invalid time slot format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  // Fetch restaurant
  const { data: restaurant } = await service
    .from('restaurants')
    .select('id, name, slug, accepts_reservations, reservation_max_advance_days, reservation_min_hours_ahead, telegram_chat_id, opening_hours, opening_hours_reservation, reservation_slot_minutes')
    .eq('id', restaurant_id)
    .eq('is_active', true)
    .eq('accepts_reservations', true)
    .single();

  if (!restaurant) {
    return new Response(JSON.stringify({ error: 'Restaurant not found or does not accept reservations' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Validate date range
  const resDate = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getTime() + (restaurant.reservation_max_advance_days ?? 30) * 24 * 60 * 60 * 1000);

  if (resDate < today || resDate > maxDate) {
    return new Response(JSON.stringify({ error: 'Date is out of allowed range' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validate guest count
  const count = parseInt(guest_count);
  if (isNaN(count) || count < 1 || count > 20) {
    return new Response(JSON.stringify({ error: 'Invalid party size' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Insert reservation
  const { data: reservation, error } = await service.from('restaurant_reservations').insert({
    restaurant_id,
    guest_name: guest_name.trim(),
    guest_email: guest_email?.trim() || null,
    guest_phone: guest_phone.trim(),
    guest_count: count,
    date,
    time_slot,
    special_requests: special_requests?.trim() || null,
    contact_preference: contact_preference || 'whatsapp',
    member_id: locals.session?.user?.id ?? null,
    status: 'pending',
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Send Telegram alert (fire and forget)
  try {
    if (restaurant.telegram_chat_id) {
      const msgId = await sendReservationAlert(reservation, restaurant);
      if (msgId) {
        await service.from('restaurant_reservations').update({
          telegram_message_id: msgId,
          telegram_chat_id: restaurant.telegram_chat_id,
        }).eq('id', reservation.id);
      }
    }
  } catch {}

  // Send email receipt (fire and forget)
  try {
    if (reservation.guest_email) {
      await sendReservationReceived(reservation, restaurant);
    }
  } catch {}

  // Send guest notification via preferred channel (WhatsApp, Viber, Telegram)
  try {
    await sendGuestNotification(reservation, restaurant, 'received');
  } catch {}

  return new Response(JSON.stringify({ reservation: { id: reservation.id, status: reservation.status } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
