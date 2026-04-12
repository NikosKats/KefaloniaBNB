import type { APIRoute } from 'astro';
import { UpdateBookingSchema } from '../../../lib/validators.ts';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendBookingConfirmed, sendBookingCancelled, sendBookingPaid, sendDepositReceived, sendBankTransferDetails, sendOwnerNotification } from '../../../lib/email.ts';
import { updateBookingAlertStatus, sendSimpleAlert } from '../../../lib/telegram.ts';
import { emitAdminEvent } from '../../../lib/admin-events.ts';
import { pushToAdminsAndOwner } from '../../../lib/push.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { id } = params;
  const service = getServiceClient();

  // SECURITY: Verify the user is admin/super_admin or owns the listing for this booking
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    const { data: booking } = await service
      .from('bookings')
      .select('listing_id')
      .eq('id', id)
      .single();
    if (!booking || (role === 'property_owner' && !locals.ownerListingIds.includes(booking.listing_id))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const body = await request.json();
  const parsed = UpdateBookingSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const updates: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.status === 'confirmed') updates.confirmed_at = new Date().toISOString();
  if (parsed.data.status === 'cancelled') updates.cancelled_at = new Date().toISOString();
  if (parsed.data.status === 'completed') updates.completed_at = new Date().toISOString();

  // When a custom deposit_amount is provided, derive remaining_amount from total
  if (parsed.data.deposit_amount !== undefined) {
    const { data: existing } = await service.from('bookings').select('total_price').eq('id', id).single();
    if (existing) {
      updates.remaining_amount = Math.max(0, existing.total_price - parsed.data.deposit_amount);
    }
  }

  const { data: booking, error } = await service
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select('*, listings(title,slug,city,region,address,country,check_in_time,check_out_time,cancellation_policy,owner_id)')
    .single();

  if (error || !booking) {
    return new Response(JSON.stringify({ error: 'Booking not found or update failed' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Audit
  await service.from('audit_logs').insert({
    actor_id: locals.session.user.id,
    action: `booking.${parsed.data.status ?? 'updated'}`,
    entity_type: 'bookings',
    entity_id: id,
    payload: updates,
  });

  // Admin dashboard event
  const refCode = (id ?? '').slice(0, 8).toUpperCase();
  const listingTitle = (booking as any).listings?.title ?? 'Listing';
  const ownerId = (booking as any).listings?.owner_id ?? null;
  if (parsed.data.status === 'confirmed') {
    const msg = `${booking.guest_name} · ${listingTitle} · €${booking.total_price} · Ref: ${refCode}`;
    emitAdminEvent({ type: 'booking.confirmed', title: 'Booking confirmed', message: msg, entity_type: 'bookings', entity_id: id, owner_id: ownerId }).catch(() => {});
    await pushToAdminsAndOwner({ type: 'booking_confirmed', message: msg, actor_name: booking.guest_name, owner_id: ownerId });
  } else if (parsed.data.status === 'cancelled') {
    const msg = `${booking.guest_name} · ${listingTitle} · €${booking.total_price} · Ref: ${refCode}`;
    emitAdminEvent({ type: 'booking.cancelled', title: 'Booking cancelled', message: msg, entity_type: 'bookings', entity_id: id, owner_id: ownerId }).catch(() => {});
    await pushToAdminsAndOwner({ type: 'booking_cancelled', message: msg, actor_name: booking.guest_name, owner_id: ownerId });
  }
  if (parsed.data.payment_status === 'deposit_paid') {
    const msg = `${booking.guest_name} · ${listingTitle} · €${(booking as any).deposit_amount ?? 0} · Ref: ${refCode}`;
    emitAdminEvent({ type: 'payment.deposit_received', title: 'Deposit received (bank)', message: msg, entity_type: 'bookings', entity_id: id, owner_id: ownerId }).catch(() => {});
    await pushToAdminsAndOwner({ type: 'deposit_received', message: msg, actor_name: booking.guest_name, owner_id: ownerId });
  } else if (parsed.data.payment_status === 'paid') {
    const msg = `${booking.guest_name} · ${listingTitle} · €${booking.total_price} · Ref: ${refCode}`;
    emitAdminEvent({ type: 'payment.full_received', title: 'Full payment received', message: msg, entity_type: 'bookings', entity_id: id, owner_id: ownerId }).catch(() => {});
    await pushToAdminsAndOwner({ type: 'payment_received', message: msg, actor_name: booking.guest_name, owner_id: ownerId });
  }

  // Email notification + Telegram message update
  // Use ctx.waitUntil so Cloudflare Workers doesn't kill these after the response is sent
  const listing = (booking as any).listings;
  const actorEmail = locals.session.user.email ?? 'Admin';
  const cfCtx = (locals as any)?.cfContext;
  const waitUntil = (p: Promise<unknown>) => cfCtx?.waitUntil ? cfCtx.waitUntil(p) : p;

  // Fetch owner email for notifications
  let ownerEmail: string | null = null;
  if (ownerId && listing) {
    const { data: ownerProf } = await service.from('profiles').select('email').eq('id', ownerId).single();
    ownerEmail = ownerProf?.email ?? null;
  }

  if (listing) {
    if (parsed.data.status === 'confirmed') {
      if (booking.payment_method === 'bank_transfer') {
        // Fetch owner payment details + platform bank defaults for the bank transfer email
        let ownerProfile: any = null;
        if (ownerId) {
          const { data } = await service
            .from('profiles')
            .select('email, payment_account_name, payment_revolut, payment_wise, payment_iban, payment_bic')
            .eq('id', ownerId)
            .single();
          ownerProfile = data;
        }
        const { data: pbRows } = await service
          .from('platform_settings')
          .select('key,value')
          .in('key', ['bank_account_name', 'bank_revolut', 'bank_wise', 'bank_iban', 'bank_bic']);
        const pb: Record<string, any> = {};
        for (const row of pbRows ?? []) pb[row.key] = row.value;
        const paymentDetails = {
          payment_account_name: ownerProfile?.payment_account_name || pb.bank_account_name || null,
          payment_revolut:      ownerProfile?.payment_revolut      || pb.bank_revolut      || null,
          payment_wise:         ownerProfile?.payment_wise         || pb.bank_wise         || null,
          payment_iban:         ownerProfile?.payment_iban         || pb.bank_iban         || null,
          payment_bic:          ownerProfile?.payment_bic          || pb.bank_bic          || null,
        };
        waitUntil(sendBankTransferDetails(booking, listing, paymentDetails, ownerProfile?.email ?? null).catch(console.error));
        waitUntil(sendSimpleAlert(
          `🏦 Bank transfer details sent to <b>${booking.guest_email}</b>\n📅 ${booking.check_in} → ${booking.check_out} · <b>€${booking.total_price}</b>\n🔖 Ref: <code>${booking.id.slice(0,8).toUpperCase()}</code>`,
          'notify_booking_confirmed',
          null,
          listing.owner_id ?? null,
        ).catch(console.error));
      } else {
        waitUntil(sendBookingConfirmed(booking, listing).catch(console.error));
        if (ownerEmail) waitUntil(sendOwnerNotification({ ownerEmail, eventType: 'confirmed', booking, listing }).catch(console.error));
      }
      if (booking.telegram_message_id) {
        const listingChatId = (listing as any).telegram_channels?.chat_id ?? null;
        waitUntil(updateBookingAlertStatus(booking.telegram_message_id, booking, listing, 'confirmed', actorEmail, listingChatId, listing.owner_id ?? null)
          .catch(console.error));
      }
    } else if (parsed.data.status === 'cancelled') {
      waitUntil(sendBookingCancelled(booking, listing).catch(console.error));
      if (ownerEmail) waitUntil(sendOwnerNotification({ ownerEmail, eventType: 'cancelled', booking, listing }).catch(console.error));
      if (booking.telegram_message_id) {
        const listingChatId = (listing as any).telegram_channels?.chat_id ?? null;
        waitUntil(updateBookingAlertStatus(booking.telegram_message_id, booking, listing, 'cancelled', actorEmail, listingChatId, listing.owner_id ?? null)
          .catch(console.error));
      }
    } else if (parsed.data.payment_status === 'deposit_paid' && booking.payment_method === 'bank_transfer') {
      // Admin marked deposit as received
      waitUntil(sendDepositReceived(booking, listing).catch(console.error));
      if (ownerEmail) waitUntil(sendOwnerNotification({ ownerEmail, eventType: 'deposit_paid', booking, listing }).catch(console.error));
      const depositAmt = (booking as any).deposit_amount ?? 0;
      const remaining  = (booking as any).remaining_amount ?? (booking.total_price - depositAmt);
      waitUntil(sendSimpleAlert(
        `💰 Deposit received from <b>${booking.guest_name}</b> (${booking.guest_email})\n📅 ${booking.check_in} → ${booking.check_out}\n💶 Deposit: <b>€${depositAmt}</b> · Remaining on arrival: <b>€${remaining}</b>\n🔖 Ref: <code>${booking.id.slice(0,8).toUpperCase()}</code>`,
        'notify_booking_confirmed',
        null,
        listing.owner_id ?? null,
      ).catch(console.error));
    } else if (parsed.data.payment_status === 'paid' && booking.payment_method === 'bank_transfer') {
      // Full payment confirmed (either full-plan or remaining balance after deposit)
      waitUntil(sendBookingPaid(booking, listing).catch(console.error));
      if (ownerEmail) waitUntil(sendOwnerNotification({ ownerEmail, eventType: 'fully_paid', booking, listing }).catch(console.error));
      waitUntil(sendSimpleAlert(
        `✅ Full payment received from <b>${booking.guest_name}</b> (${booking.guest_email})\n📅 ${booking.check_in} → ${booking.check_out}\n💶 Total: <b>€${booking.total_price}</b>\n🔖 Ref: <code>${booking.id.slice(0,8).toUpperCase()}</code>`,
        'notify_booking_confirmed',
        null,
        listing.owner_id ?? null,
      ).catch(console.error));
    }
  }

  return new Response(JSON.stringify({ booking }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', locals.session.user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const { id } = params;

  const { error } = await service.from('bookings').delete().eq('id', id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  await service.from('audit_logs').insert({
    actor_id: locals.session!.user.id,
    action: 'booking.deleted',
    entity_type: 'bookings',
    entity_id: id,
    payload: { permanent: true },
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
