import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import {
  answerCallbackQuery,
  updateBookingAlertStatus,
  sendSimpleAlert,
  sendMessageToChat,
} from '../../../lib/telegram.ts';
import {
  sendBookingConfirmed,
  sendBookingCancelled,
  sendBankTransferDetails,
  sendTelegramDirectAccepted,
  sendTelegramDirectDeclined,
  sendOwnerNotification,
  sendBookingPaid,
} from '../../../lib/email.ts';
import { emitAdminEvent } from '../../../lib/admin-events.ts';
import { pushToAdminsAndOwner } from '../../../lib/push.ts';

const BOT_USERNAME = 'kefalonia_rentals_bot';

export const POST: APIRoute = async ({ request, locals }) => {
  // ── 1. Verify secret token ───────────────────────────────────────────────
  const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = import.meta.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const cfCtx = (locals as any)?.cfContext;
  const waitUntil = (p: Promise<unknown>) => cfCtx?.waitUntil ? cfCtx.waitUntil(p) : p;
  const service = getServiceClient();

  // ── 2. Handle /start messages ────────────────────────────────────────────
  const msg = update.message;
  if (msg?.text?.startsWith('/start')) {
    // Use chat.id (reliable for private chats) — same as from.id in 1:1 but explicit
    const guestChatId = String(msg.chat?.id ?? msg.from.id);

    const startParam = msg.text.slice(7).trim(); // everything after "/start "

    if (startParam.startsWith('dep') && startParam.length >= 35) {
      // Owner tapped deposit deep link from channel: dep{32hex}
      const uuidHex = startParam.slice(3, 35);
      const deepLinkBookingId = [uuidHex.slice(0,8), uuidHex.slice(8,12), uuidHex.slice(12,16), uuidHex.slice(16,20), uuidHex.slice(20)].join('-');
      const deepRef = deepLinkBookingId.slice(0, 8).toUpperCase();
      const { data: depBk } = await service.from('bookings').select('total_price').eq('id', deepLinkBookingId).single();
      const token = import.meta.env.TELEGRAM_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: guestChatId,
          text:
            `💰 <b>Mark Deposit as Paid</b>\n\n` +
            `Total booking: <b>€${depBk?.total_price ?? '?'}</b>\n` +
            `🔖 Ref: <code>${deepRef}</code>\n\n` +
            `👇 <b>Reply to this message</b> with the deposit amount received (e.g. <code>240</code>).\n\n` +
            `<code>[TD_DEP_PROMPT:${deepLinkBookingId}]</code>`,
          parse_mode: 'HTML',
          reply_markup: { force_reply: true, selective: false },
        }),
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });

    } else if (startParam.startsWith('bk_')) {
      // Guest connected via deep link from success page
      const bookingId = startParam.replace('bk_', '').trim();

      if (bookingId) {
        const { data: booking } = await service
          .from('bookings')
          .select('id, guest_name, listing_id, check_in, check_out, total_price, listings(title)')
          .eq('id', bookingId)
          .single();

        if (booking) {
          await service.from('bookings').update({ guest_telegram_chat_id: guestChatId }).eq('id', bookingId);
          const listing = (booking as any).listings;
          const ref = bookingId.slice(0, 8).toUpperCase();
          await sendMessageToChat(guestChatId,
            `✅ <b>Connected!</b> You'll receive instant updates here.\n\n` +
            `<b>${listing?.title ?? 'Your booking'}</b>\n` +
            `📅 ${booking.check_in} → ${booking.check_out}\n` +
            `💶 Total: €${booking.total_price}\n` +
            `🔖 Ref: <code>${ref}</code>\n\n` +
            `We'll notify you as soon as the owner responds.`
          );
        } else {
          await sendMessageToChat(guestChatId,
            `❌ Booking not found.\n\nPlease check your confirmation email and make sure you used the correct link.`
          );
        }
      }
    } else {
      // Plain /start — user opened bot manually without a booking link
      await sendMessageToChat(guestChatId,
        `👋 <b>Welcome to KefaloniaBNB!</b>\n\n` +
        `This bot sends you booking updates and lets you stay connected with your host.\n\n` +
        `To link your Telegram to a booking, tap the <b>Connect on Telegram</b> button from your booking confirmation page.`
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // ── 3. Handle replies to bot prompts (payment details / deposit amount) ───
  if (msg && msg.reply_to_message) {
    const replyToText: string = (msg as any).reply_to_message?.text ?? '';

    // ── Deposit amount reply ───────────────────────────────────────────────
    const depMatch = replyToText.match(/\[TD_DEP_PROMPT:([^\]]+)\]/);
    if (depMatch) {
      const depBookingId = depMatch[1];
      const amountRaw = parseFloat((msg.text ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
      if (isNaN(amountRaw) || amountRaw <= 0) {
        await sendMessageToChat(String(msg.chat.id), `❌ Invalid amount. Please reply with a number, e.g. <code>240</code>`, );
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      const { data: bk } = await service
        .from('bookings')
        .select('*, listings(title)')
        .eq('id', depBookingId)
        .single();

      if (!bk) {
        await sendMessageToChat(String(msg.chat.id), `❌ Booking not found.`);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      await service.from('bookings')
        .update({ payment_status: 'deposit_paid', amount_paid: amountRaw })
        .eq('id', depBookingId);
      await service.from('audit_logs').insert({ action: 'booking.deposit_paid', entity_type: 'bookings', entity_id: depBookingId, payload: { amount: amountRaw, via: 'telegram_direct' } });

      const listingTitle = (bk as any).listings?.title ?? 'booking';
      const ref = depBookingId.slice(0, 8).toUpperCase();
      const remaining = Math.round(((bk as any).total_price - amountRaw) * 100) / 100;
      const guestDepChatId = (bk as any).guest_telegram_chat_id ?? null;

      if (guestDepChatId) {
        await sendMessageToChat(guestDepChatId,
          `💰 <b>Deposit received!</b>\n\n<b>${listingTitle}</b>\n` +
          `✅ Deposit paid: <b>€${amountRaw}</b>\n` +
          `💶 Remaining due on arrival: <b>€${remaining}</b>\n` +
          `🔖 Ref: <code>${ref}</code>\n\nSee you soon! 🏡`
        );
      }

      const token = import.meta.env.TELEGRAM_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(msg.chat.id),
          text:
            `✅ Deposit of <b>€${amountRaw}</b> recorded.\n` +
            `💶 Remaining: <b>€${remaining}</b>\n` +
            (guestDepChatId ? `✅ Guest notified via Telegram.` : `ℹ️ Guest hasn't connected Telegram — notify manually.`),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💶 Mark Full as Paid', callback_data: `td_paid:${depBookingId}` }],
              [
                { text: '📋 Send Check-in Details', callback_data: `td_checkin:${depBookingId}` },
                { text: '🚪 Send Check-out Details', callback_data: `td_checkout:${depBookingId}` },
              ],
            ],
          },
        }),
      });

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

  }

  // ── 4. Only handle callback_query below this point ───────────────────────
  const cb = update.callback_query;
  if (!cb) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const { id: callbackQueryId, data, from, message } = cb;
  if (!data || !message) {
    await answerCallbackQuery(callbackQueryId, 'Invalid callback data.', true);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const [action, bookingId] = data.split(':');
  if (!bookingId) {
    await answerCallbackQuery(callbackQueryId, 'Unknown action.', true);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const actorName = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Admin';

  // ── Restaurant reservation callbacks ────────────────────────────────────
  if (action === 'res_confirm' || action === 'res_reject') {
    const resId = bookingId; // reusing the split variable
    const newStatus = action === 'res_confirm' ? 'confirmed' : 'cancelled';

    const { data: reservation, error: resErr } = await service
      .from('restaurant_reservations')
      .select('*, restaurants(name)')
      .eq('id', resId)
      .single();

    if (resErr || !reservation) {
      await answerCallbackQuery(callbackQueryId, '❌ Reservation not found.', true);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (reservation.status !== 'pending') {
      await answerCallbackQuery(callbackQueryId, `Already ${reservation.status}.`, true);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Update status
    await service.from('restaurant_reservations').update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', resId);

    // Edit the Telegram message to show the result
    const statusEmoji = newStatus === 'confirmed' ? '✅' : '❌';
    const updatedText = message.text + `\n\n${statusEmoji} <b>${newStatus.toUpperCase()}</b> by ${actorName}`;
    try {
      const chatId = message.chat.id;
      const tgToken = import.meta.env.TELEGRAM_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${tgToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: message.message_id,
          text: updatedText,
          parse_mode: 'HTML',
        }),
      });
    } catch {}

    // Send email to guest
    if (reservation.guest_email) {
      waitUntil((async () => {
        try {
          const { sendReservationConfirmed, sendReservationCancelled } = await import('../../../lib/email.ts');
          const restaurant = reservation.restaurants ?? { name: 'Restaurant' };
          if (newStatus === 'confirmed') {
            await sendReservationConfirmed(reservation, restaurant);
          } else {
            await sendReservationCancelled(reservation, restaurant);
          }
        } catch {}
      })());
    }

    // Send notification via guest's preferred channel (WhatsApp/Viber/Telegram)
    waitUntil((async () => {
      try {
        const { sendGuestNotification } = await import('../../../lib/whatsapp.ts');
        const restaurant = reservation.restaurants ?? { name: 'Restaurant' };
        await sendGuestNotification(reservation, restaurant, newStatus as 'confirmed' | 'cancelled');
      } catch {}
    })());

    await answerCallbackQuery(callbackQueryId, `${statusEmoji} Reservation ${newStatus}!`);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // ── 4. Telegram Direct callbacks: td_accept / td_decline / td_paid ───────
  if (['td_accept', 'td_decline', 'td_paid', 'td_dep', 'td_checkin', 'td_checkout'].includes(action)) {
    // Check if Telegram management is enabled (skip for checkin/checkout which are informational)
    if (['td_accept', 'td_decline', 'td_paid', 'td_dep'].includes(action)) {
      const { data: tgSetting } = await service.from('platform_settings').select('value').eq('key', 'telegram_booking_management').single();
      if (tgSetting?.value === false) {
        await answerCallbackQuery(callbackQueryId, '📋 Telegram management is disabled. Please manage bookings from the admin dashboard.', true);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
    }

    const { data: booking, error: bookingErr } = await service
      .from('bookings')
      .select('*, listings(title,slug,city,check_in_time,check_out_time,owner_id,telegram_channels(chat_id))')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      await answerCallbackQuery(callbackQueryId, '❌ Booking not found.', true);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const listing = (booking as any).listings;
    const listingChatId = listing?.telegram_channels?.chat_id ?? null;
    const listingOwnerId = listing?.owner_id ?? null;
    const guestChatId = (booking as any).guest_telegram_chat_id ?? null;
    const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
    const ref = bookingId.slice(0, 8).toUpperCase();

    // ── td_accept ────────────────────────────────────────────────────────
    if (action === 'td_accept') {
      if (booking.status !== 'pending') {
        await answerCallbackQuery(callbackQueryId, `Booking is already ${booking.status}.`, true);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      await service.from('bookings').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', bookingId);
      await service.from('audit_logs').insert({ action: 'booking.confirmed', entity_type: 'bookings', entity_id: bookingId, payload: { via: 'telegram_direct', actor: actorName } });
      const tdAcceptMsg = `${booking.guest_name} · ${listing?.title ?? 'Listing'} · €${booking.total_price} · by ${actorName}`;
      emitAdminEvent({
        type: 'booking.confirmed',
        title: 'TD booking accepted',
        message: tdAcceptMsg,
        entity_type: 'bookings', entity_id: bookingId, owner_id: listingOwnerId,
      }).catch(() => {});
      await pushToAdminsAndOwner({ type: 'booking_confirmed', message: tdAcceptMsg, actor_name: booking.guest_name, owner_id: listingOwnerId });

      // Fetch owner contact
      const { data: ownerProfile } = await service.from('profiles').select('full_name, phone, email').eq('id', listingOwnerId).single();

      // Build guest contact buttons for easy follow-up
      const guestPhoneDigits = (booking.guest_phone ?? '').replace(/[^\d]/g, '');
      const guestContactRow = guestPhoneDigits ? [
        { text: '💬 WhatsApp', url: `https://wa.me/${guestPhoneDigits}` },
        { text: '📱 Telegram', url: `https://t.me/+${guestPhoneDigits}` },
        { text: '📞 Viber', url: `https://viber.me/+${guestPhoneDigits}` },
      ] : [];

      const acceptedText = [
        `📬 <b>Direct Booking — ACCEPTED</b> ✅`,
        `<b>${listing?.title}</b>`,
        ``,
        `👤 ${booking.guest_name}`,
        `📧 ${booking.guest_email}`,
        booking.guest_phone ? `📱 ${booking.guest_phone}` : null,
        `📅 ${booking.check_in} → ${booking.check_out} · ${booking.nights}n`,
        `💶 <b>€${booking.total_price}</b>`,
        `🔖 Ref: <code>${ref}</code>`,
        ``,
        `✅ Accepted by ${actorName}`,
        `💬 Guest notified — contact them to arrange payment.`,
        `💡 Cash · Bank transfer · Any method you agree on`,
        ``,
        `<a href="${siteUrl}/admin/bookings/${bookingId}">Open in admin →</a>`,
      ].filter(l => l !== null).join('\n');

      // Edit original message: show guest contact + payment method buttons
      const token = import.meta.env.TELEGRAM_BOT_TOKEN;
      const editChatId = String(message.chat.id);
      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: editChatId,
          message_id: message.message_id,
          text: acceptedText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              ...(guestContactRow.length ? [guestContactRow] : []),
              [
                { text: '💰 Deposit Paid', callback_data: `td_dep:${bookingId}` },
                { text: '💶 Full Paid', callback_data: `td_paid:${bookingId}` },
              ],
            ],
          },
          link_preview_options: { is_disabled: true },
        }),
      });

      // Answer callback
      await answerCallbackQuery(callbackQueryId, '✅ Accepted! Guest notified with your contact details.', false);

      // Email to guest
      waitUntil(sendTelegramDirectAccepted({
        guestEmail: booking.guest_email,
        guestName: booking.guest_name,
        listingTitle: listing?.title ?? 'Property',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        nights: booking.nights,
        totalPrice: booking.total_price,
        ownerName: ownerProfile?.full_name ?? null,
        ownerPhone: ownerProfile?.phone ?? null,
        bookingId,
      }).catch(console.error));

      // Email to owner
      if (ownerProfile?.email && listing) {
        waitUntil(sendOwnerNotification({ ownerEmail: ownerProfile.email, eventType: 'td_accepted', booking, listing }).catch(console.error));
      }

      // Telegram to guest (if connected)
      if (guestChatId) {
        const ownerLines = [
          ownerProfile?.full_name ? `👤 <b>Owner:</b> ${ownerProfile.full_name}` : null,
          ownerProfile?.phone     ? `📱 <b>Phone / WhatsApp / Viber:</b> ${ownerProfile.phone}` : null,
          ownerProfile?.email     ? `📧 <b>Email:</b> ${ownerProfile.email}` : null,
        ].filter(Boolean).join('\n');
        const isDeposit = (booking as any).payment_type === 'deposit' && (booking as any).deposit_amount > 0;
        const paymentLine = isDeposit
          ? `💰 Deposit due: <b>€${(booking as any).deposit_amount}</b> · Remaining on arrival: <b>€${(booking as any).remaining_amount}</b>`
          : `💶 Total due: <b>€${booking.total_price}</b>`;
        waitUntil(sendMessageToChat(guestChatId,
          `🎉 <b>Booking Accepted!</b>\n\n<b>${listing?.title}</b>\n📅 ${booking.check_in} → ${booking.check_out}\n${paymentLine}\n🔖 Ref: <code>${ref}</code>\n\n` +
          (ownerLines ? `<b>Owner contact details:</b>\n${ownerLines}\n\n` : '') +
          `Contact the owner to arrange payment.`
        ));
      }
    }

    // ── td_decline ────────────────────────────────────────────────────────
    else if (action === 'td_decline') {
      if (booking.status !== 'pending') {
        await answerCallbackQuery(callbackQueryId, `Booking is already ${booking.status}.`, true);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      await service.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: `Declined via Telegram by ${actorName}` }).eq('id', bookingId);
      await service.from('audit_logs').insert({ action: 'booking.cancelled', entity_type: 'bookings', entity_id: bookingId, payload: { via: 'telegram_direct', actor: actorName } });
      const tdDeclineMsg = `${booking.guest_name} · ${listing?.title ?? 'Listing'} · €${booking.total_price} · by ${actorName}`;
      emitAdminEvent({
        type: 'booking.cancelled',
        title: 'TD booking declined',
        message: tdDeclineMsg,
        entity_type: 'bookings', entity_id: bookingId, owner_id: listingOwnerId,
      }).catch(() => {});
      await pushToAdminsAndOwner({ type: 'booking_cancelled', message: tdDeclineMsg, actor_name: booking.guest_name, owner_id: listingOwnerId });

      // Edit original message
      const token = import.meta.env.TELEGRAM_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(message.chat.id),
          message_id: message.message_id,
          text: `📬 <b>Direct Booking — DECLINED</b> ❌\n<b>${listing?.title}</b>\n\n👤 ${booking.guest_name}\n📅 ${booking.check_in} → ${booking.check_out}\n💶 €${booking.total_price}\n🔖 Ref: <code>${ref}</code>\n\n❌ Declined by ${actorName}`,
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        }),
      });

      await answerCallbackQuery(callbackQueryId, '❌ Declined. Guest will be notified.', false);

      waitUntil(sendTelegramDirectDeclined({
        guestEmail: booking.guest_email,
        guestName: booking.guest_name,
        listingTitle: listing?.title ?? 'Property',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        bookingId,
      }).catch(console.error));

      // Email to owner
      if (listingOwnerId && listing) {
        const { data: ownerP } = await service.from('profiles').select('email').eq('id', listingOwnerId).single();
        if (ownerP?.email) waitUntil(sendOwnerNotification({ ownerEmail: ownerP.email, eventType: 'td_declined', booking, listing }).catch(console.error));
      }

      if (guestChatId) {
        waitUntil(sendMessageToChat(guestChatId,
          `😔 Your booking request for <b>${listing?.title}</b> (${booking.check_in} → ${booking.check_out}) could not be confirmed.\n\nThe dates have been released. Browse other properties at <a href="${siteUrl}/rentals">${siteUrl}/rentals</a>`
        ));
      }
    }

    // ── td_paid ───────────────────────────────────────────────────────────
    else if (action === 'td_paid') {
      if ((booking as any).payment_status === 'paid') {
        await answerCallbackQuery(callbackQueryId, 'Already marked as paid.', true);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      await service.from('bookings').update({
        payment_status: 'paid',
        amount_paid: booking.total_price,
        payout_status: 'manual_paid',
        payout_at: new Date().toISOString(),
      }).eq('id', bookingId);
      await service.from('audit_logs').insert({ action: 'booking.paid', entity_type: 'bookings', entity_id: bookingId, payload: { via: 'telegram_direct', actor: actorName } });
      const tdPaidMsg = `${booking.guest_name} · ${listing?.title ?? 'Listing'} · €${booking.total_price} · by ${actorName}`;
      emitAdminEvent({
        type: 'payment.full_received',
        title: 'TD booking marked as paid',
        message: tdPaidMsg,
        entity_type: 'bookings', entity_id: bookingId, owner_id: listingOwnerId,
      }).catch(() => {});
      await pushToAdminsAndOwner({ type: 'payment_received', message: tdPaidMsg, actor_name: booking.guest_name, owner_id: listingOwnerId });

      // Edit message — keep check-in/check-out action buttons
      const token = import.meta.env.TELEGRAM_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(message.chat.id),
          message_id: message.message_id,
          text: `📬 <b>Direct Booking — PAID</b> 💶✅\n<b>${listing?.title}</b>\n\n👤 ${booking.guest_name}\n📅 ${booking.check_in} → ${booking.check_out}\n💶 <b>€${booking.total_price} — PAID</b>\n🔖 Ref: <code>${ref}</code>\n\n💶 Marked as paid by ${actorName}\n<a href="${siteUrl}/admin/bookings/${bookingId}">Open in admin →</a>`,
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
          reply_markup: {
            inline_keyboard: [[
              { text: '📋 Send Check-in Details', callback_data: `td_checkin:${bookingId}` },
              { text: '🚪 Send Check-out Details', callback_data: `td_checkout:${bookingId}` },
            ]],
          },
        }),
      });

      await answerCallbackQuery(callbackQueryId, '💶 Marked as paid!', false);

      // Email to guest — payment confirmation
      if (listing) {
        waitUntil(sendBookingPaid(booking, listing).catch(console.error));
      }

      // Email to owner
      if (listingOwnerId && listing) {
        const { data: ownerP } = await service.from('profiles').select('email').eq('id', listingOwnerId).single();
        if (ownerP?.email) waitUntil(sendOwnerNotification({ ownerEmail: ownerP.email, eventType: 'td_paid', booking, listing }).catch(console.error));
      }

      if (guestChatId) {
        waitUntil(sendMessageToChat(guestChatId,
          `💶 <b>Payment confirmed!</b>\n\nThank you — your payment for <b>${listing?.title}</b> has been recorded.\n📅 ${booking.check_in} → ${booking.check_out}\n🔖 Ref: <code>${ref}</code>\n\nEnjoy your stay! 🏡`
        ));
      }
    }

    // ── td_checkin ────────────────────────────────────────────────────────
    else if (action === 'td_checkin') {
      const { data: fullListing } = await service
        .from('listings')
        .select('title, address, city, check_in_time, checkin_instructions, house_rules')
        .eq('id', (listing as any)?.id ?? booking.listing_id)
        .single();

      const ciMsg =
        `📋 <b>Check-in Details</b>\n\n` +
        `<b>${fullListing?.title ?? listing?.title}</b>\n` +
        `📅 Check-in: ${booking.check_in} from <b>${fullListing?.check_in_time ?? listing?.check_in_time}</b>\n` +
        (fullListing?.address ? `📍 ${fullListing.address}${fullListing.city ? `, ${fullListing.city}` : ''}\n` : '') +
        `🔖 Ref: <code>${ref}</code>\n\n` +
        (fullListing?.checkin_instructions ? `${fullListing.checkin_instructions}` : 'The owner will provide access details on arrival.');

      if (guestChatId) {
        await sendMessageToChat(guestChatId, ciMsg);
        await answerCallbackQuery(callbackQueryId, '✅ Check-in details sent to guest via Telegram', false);
      } else {
        await answerCallbackQuery(callbackQueryId, "⚠️ Guest hasn't connected Telegram — details not sent", true);
      }
      // Also confirm in admin channel
      const token = import.meta.env.TELEGRAM_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(message.chat.id),
          text: guestChatId
            ? `✅ Check-in details sent to guest.`
            : `⚠️ Guest hasn't connected Telegram yet — send check-in details manually.`,
          parse_mode: 'HTML',
        }),
      });
    }

    // ── td_checkout ───────────────────────────────────────────────────────
    else if (action === 'td_checkout') {
      const { data: fullListing } = await service
        .from('listings')
        .select('title, check_out_time, house_rules')
        .eq('id', (listing as any)?.id ?? booking.listing_id)
        .single();

      const coMsg =
        `🚪 <b>Check-out Details</b>\n\n` +
        `<b>${fullListing?.title ?? listing?.title}</b>\n` +
        `📅 Check-out: ${booking.check_out} by <b>${fullListing?.check_out_time ?? listing?.check_out_time}</b>\n` +
        `🔖 Ref: <code>${ref}</code>\n\n` +
        (fullListing?.house_rules
          ? `Please remember:\n${fullListing.house_rules}`
          : 'Please make sure to lock all doors and windows before leaving. Safe travels! ✈️');

      if (guestChatId) {
        await sendMessageToChat(guestChatId, coMsg);
        await answerCallbackQuery(callbackQueryId, '✅ Check-out details sent to guest via Telegram', false);
      } else {
        await answerCallbackQuery(callbackQueryId, "⚠️ Guest hasn't connected Telegram — details not sent", true);
      }
      const token = import.meta.env.TELEGRAM_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(message.chat.id),
          text: guestChatId
            ? `✅ Check-out details sent to guest.`
            : `⚠️ Guest hasn't connected Telegram yet — send check-out details manually.`,
          parse_mode: 'HTML',
        }),
      });
    }


    // ── td_dep ────────────────────────────────────────────────────────────
    else if (action === 'td_dep') {
      const token = import.meta.env.TELEGRAM_BOT_TOKEN;
      const uuidHex = bookingId.replace(/-/g, '');
      const deepLinkParam = `dep${uuidHex}`;

      // Use answerCallbackQuery with url — opens deep link directly on owner's device.
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          url: `https://t.me/${BOT_USERNAME}?start=${deepLinkParam}`,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // ── 5. Bank transfer callbacks: approve / reject ─────────────────────────
  if (!['approve', 'reject'].includes(action)) {
    await answerCallbackQuery(callbackQueryId, 'Unknown action.', true);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Check if Telegram management is enabled
  const { data: tgBtSetting } = await service.from('platform_settings').select('value').eq('key', 'telegram_booking_management').single();
  if (tgBtSetting?.value === false) {
    await answerCallbackQuery(callbackQueryId, '📋 Telegram management is disabled. Please manage bookings from the admin dashboard.', true);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const { data: booking, error: bookingErr } = await service
    .from('bookings')
    .select('*, listings(title,slug,city,address,country,check_in_time,check_out_time,cancellation_policy,owner_id,telegram_channels(chat_id))')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    await answerCallbackQuery(callbackQueryId, '❌ Booking not found.', true);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (booking.status !== 'pending') {
    await answerCallbackQuery(callbackQueryId, `This booking is already ${booking.status}. No action taken.`, true);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const newStatus = action === 'approve' ? 'confirmed' : 'cancelled';
  const listing = (booking as any).listings;

  const updatePayload: Record<string, unknown> =
    newStatus === 'confirmed'
      ? { status: 'confirmed', confirmed_at: new Date().toISOString() }
      : { status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: `Rejected via Telegram by ${actorName}` };

  const { error: updateErr } = await service.from('bookings').update(updatePayload).eq('id', bookingId);
  if (updateErr) {
    await answerCallbackQuery(callbackQueryId, '❌ Database update failed. Please try in admin.', true);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  await service.from('audit_logs').insert({
    action: `booking.${newStatus}`,
    entity_type: 'bookings',
    entity_id: bookingId,
    payload: { via: 'telegram', actor: actorName },
  });

  // Admin dashboard event + push
  const tgStatusMsg = `${booking.guest_name} · ${listing?.title ?? 'Listing'} · €${booking.total_price} · by ${actorName}`;
  emitAdminEvent({
    type: newStatus === 'confirmed' ? 'booking.confirmed' : 'booking.cancelled',
    title: newStatus === 'confirmed' ? 'Booking approved via Telegram' : 'Booking rejected via Telegram',
    message: tgStatusMsg,
    entity_type: 'bookings',
    entity_id: bookingId,
    owner_id: listing?.owner_id ?? null,
  }).catch(() => {});
  await pushToAdminsAndOwner({ type: newStatus === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled', message: tgStatusMsg, actor_name: booking.guest_name, owner_id: listing?.owner_id ?? null });

  const updatedBooking = { ...booking, ...updatePayload };
  const listingChatId = (listing as any).telegram_channels?.chat_id ?? null;
  const listingOwnerId = (listing as any)?.owner_id ?? null;

  await updateBookingAlertStatus(message.message_id, updatedBooking as any, listing, newStatus, actorName, listingChatId, listingOwnerId)
    .catch((err) => console.error('Telegram message update failed:', err));

  const ackText = newStatus === 'confirmed'
    ? booking.payment_method === 'bank_transfer'
      ? '✅ Booking approved! Bank transfer details sent to guest.'
      : '✅ Booking approved! Confirmation email sent to guest.'
    : '❌ Booking rejected. Guest will be notified.';
  await answerCallbackQuery(callbackQueryId, ackText, false);

  if (listing) {
    if (newStatus === 'confirmed') {
      if (booking.payment_method === 'bank_transfer') {
        const { data: ownerProfile } = await service
          .from('profiles')
          .select('email, payment_account_name, payment_revolut, payment_wise, payment_iban, payment_bic')
          .eq('id', (listing as any).owner_id)
          .single();
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
        waitUntil(sendBankTransferDetails(updatedBooking as any, listing, paymentDetails, ownerProfile?.email ?? null).catch(console.error));
      } else {
        waitUntil(sendBookingConfirmed(updatedBooking as any, listing).catch(console.error));
      }
    } else {
      waitUntil(sendBookingCancelled(updatedBooking as any, listing).catch(console.error));
    }
  }

  const followUp = newStatus === 'confirmed'
    ? booking.payment_method === 'bank_transfer'
      ? `🏦 Bank transfer details sent to <b>${booking.guest_email}</b>`
      : `📧 Confirmation email sent to <b>${booking.guest_email}</b>`
    : `📧 Cancellation email sent to <b>${booking.guest_email}</b>`;
  waitUntil(sendSimpleAlert(followUp, 'notify_booking_confirmed', listingChatId, listingOwnerId).catch(console.error));

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// ── Helper: resolve the first chat_id for an owner (for message edits) ────
async function resolveFirstChannel(ownerId: string | null): Promise<string | null> {
  if (!ownerId) return import.meta.env.TELEGRAM_CHAT_ID ?? null;
  const { getServiceClient } = await import('../../../lib/supabase.ts');
  const { data } = await getServiceClient()
    .from('telegram_channels')
    .select('chat_id')
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .limit(1)
    .single();
  return data?.chat_id ?? import.meta.env.TELEGRAM_CHAT_ID ?? null;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; last_name?: string; username?: string };
    chat: { id: number };
    text?: string;
    reply_to_message?: { message_id: number; text?: string };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; last_name?: string; username?: string };
    message: { message_id: number; chat: { id: number }; text?: string };
    data?: string;
  };
}
