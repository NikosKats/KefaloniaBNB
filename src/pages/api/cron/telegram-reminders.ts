import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendMessageToChat } from '../../../lib/telegram.ts';

/**
 * GET /api/cron/telegram-reminders
 *
 * Runs hourly. Sends Telegram messages to guests who have connected:
 * - 1 hour before check-in: check-in instructions
 * - 1 hour before check-out: check-out reminder
 *
 * Uses Greece timezone (Europe/Athens) since all properties are in Greece.
 */
export const GET: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET;
  const incoming = request.headers.get('x-cron-secret');
  if (!secret || incoming !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const service = getServiceClient();

  // Current time in Greece (Europe/Athens = EET/EEST)
  const now = new Date();
  const greeceFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(
    greeceFormatter.formatToParts(now).map(p => [p.type, p.value])
  );
  const greeceDate   = `${parts.year}-${parts.month}-${parts.day}`;   // YYYY-MM-DD
  const greeceHour   = parseInt(parts.hour);                           // 0-23
  const targetHour   = greeceHour + 1;                                 // next hour = when check-in/out happens
  const targetHHStr  = String(targetHour).padStart(2, '0');           // "15" → "15:…"

  const results: { id: string; type: string; status: string }[] = [];

  // ── Check-in reminders ────────────────────────────────────────────────────
  const { data: checkIns } = await service
    .from('bookings')
    .select('id, guest_name, guest_telegram_chat_id, check_in, check_out, total_price, listing_id, listings(title, address, city, check_in_time, checkin_instructions)')
    .eq('status', 'confirmed')
    .eq('check_in', greeceDate)
    .is('telegram_checkin_sent_at', null)
    .not('guest_telegram_chat_id', 'is', null);

  for (const bk of checkIns ?? []) {
    const lst = (bk as any).listings;
    const checkInTime: string = lst?.check_in_time ?? '';
    // Only send if listing's check_in_time matches target hour (e.g. "15:00" → target "15")
    if (!checkInTime.startsWith(targetHHStr)) continue;

    const guestChatId = (bk as any).guest_telegram_chat_id;
    const ref = bk.id.slice(0, 8).toUpperCase();
    const msg =
      `⏰ <b>Check-in in 1 hour!</b>\n\n` +
      `<b>${lst?.title}</b>\n` +
      `📅 Today ${bk.check_in} from <b>${checkInTime}</b>\n` +
      (lst?.address ? `📍 ${lst.address}${lst.city ? `, ${lst.city}` : ''}\n` : '') +
      `🔖 Ref: <code>${ref}</code>\n\n` +
      (lst?.checkin_instructions
        ? `${lst.checkin_instructions}`
        : 'Your host will be in touch with access details. Welcome! 🏡');

    try {
      await sendMessageToChat(guestChatId, msg);
      await service.from('bookings')
        .update({ telegram_checkin_sent_at: now.toISOString() })
        .eq('id', bk.id);
      results.push({ id: bk.id, type: 'checkin', status: 'sent' });
    } catch (e) {
      console.error(`telegram-reminders: checkin failed for ${bk.id}`, e);
      results.push({ id: bk.id, type: 'checkin', status: 'failed' });
    }
  }

  // ── Check-out reminders ───────────────────────────────────────────────────
  const { data: checkOuts } = await service
    .from('bookings')
    .select('id, guest_name, guest_telegram_chat_id, check_in, check_out, listings(title, check_out_time, house_rules)')
    .eq('status', 'confirmed')
    .eq('check_out', greeceDate)
    .is('telegram_checkout_sent_at', null)
    .not('guest_telegram_chat_id', 'is', null);

  for (const bk of checkOuts ?? []) {
    const lst = (bk as any).listings;
    const checkOutTime: string = lst?.check_out_time ?? '';
    if (!checkOutTime.startsWith(targetHHStr)) continue;

    const guestChatId = (bk as any).guest_telegram_chat_id;
    const ref = bk.id.slice(0, 8).toUpperCase();
    const msg =
      `⏰ <b>Check-out in 1 hour!</b>\n\n` +
      `<b>${lst?.title}</b>\n` +
      `📅 Check-out today ${bk.check_out} by <b>${checkOutTime}</b>\n` +
      `🔖 Ref: <code>${ref}</code>\n\n` +
      (lst?.house_rules
        ? `Please remember:\n${lst.house_rules}\n\nSafe travels! ✈️`
        : `Please make sure to lock all doors and windows. Safe travels! ✈️`);

    try {
      await sendMessageToChat(guestChatId, msg);
      await service.from('bookings')
        .update({ telegram_checkout_sent_at: now.toISOString() })
        .eq('id', bk.id);
      results.push({ id: bk.id, type: 'checkout', status: 'sent' });
    } catch (e) {
      console.error(`telegram-reminders: checkout failed for ${bk.id}`, e);
      results.push({ id: bk.id, type: 'checkout', status: 'failed' });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
