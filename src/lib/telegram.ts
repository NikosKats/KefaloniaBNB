import type { Booking, Listing } from '../types/index.ts';
import { getServiceClient } from './supabase.ts';
import { fmtDateTelegram } from './format.ts';

const API = (token: string) => `https://api.telegram.org/bot${token}`;

function token() {
  const t = import.meta.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN not set');
  return t;
}

// Legacy single chat ID fallback (env var)
function envChatId() {
  return import.meta.env.TELEGRAM_CHAT_ID ?? '';
}

type TelegramChannel = {
  chat_id: string;
  notify_booking_new: boolean;
  notify_booking_confirmed: boolean;
  notify_booking_cancelled: boolean;
};

const CHANNEL_COLS = 'chat_id, notify_booking_new, notify_booking_confirmed, notify_booking_cancelled';

/** Returns chat IDs for channels belonging to a specific owner. */
async function getChannelsForOwner(ownerId: string, filter?: keyof TelegramChannel | undefined): Promise<string[]> {
  try {
    const { data } = await getServiceClient()
      .from('telegram_channels')
      .select(CHANNEL_COLS)
      .eq('is_active', true)
      .eq('owner_id', ownerId);
    if (data && data.length > 0) {
      return (data as TelegramChannel[])
        .filter((ch) => !filter || ch[filter] === true)
        .map((ch) => ch.chat_id);
    }
  } catch {}
  return [];
}

/** Returns chat IDs for global channels (owner_id IS NULL). Falls back to env var. */
async function getActiveChannels(filter?: keyof TelegramChannel | undefined): Promise<string[]> {
  try {
    const { data } = await getServiceClient()
      .from('telegram_channels')
      .select(CHANNEL_COLS)
      .eq('is_active', true)
      .is('owner_id', null);
    if (data && data.length > 0) {
      const filtered = (data as TelegramChannel[])
        .filter((ch) => !filter || ch[filter] === true)
        .map((ch) => ch.chat_id);
      // Only return DB channels if at least one matched the filter;
      // otherwise fall through to env var (channels exist but filter doesn't match any)
      if (filtered.length > 0) return filtered;
    }
  } catch {}
  // Fallback to env var
  const fallback = envChatId();
  return fallback ? [fallback] : [];
}

/**
 * Resolve which chat IDs to send a notification to.
 *
 * Recipients:
 *   1. ownerId channels — channels assigned to the listing's owner
 *   2. overrideChatId   — explicit per-listing channel FK (if no owner channels)
 *   3. global channels  — channels with owner_id IS NULL, ALWAYS included as CC
 *      (super admins add themselves here to receive all notifications)
 *
 * filter is optional — omit it to target all active channels regardless of flags.
 */
async function resolveChannels(
  filter: keyof TelegramChannel | undefined,
  overrideChatId?: string | null,
  ownerId?: string | null,
): Promise<string[]> {
  const results: string[] = [];

  if (ownerId) {
    const ownerChannels = await getChannelsForOwner(ownerId, filter);
    results.push(...ownerChannels);
  }

  if (results.length === 0 && overrideChatId) {
    results.push(overrideChatId);
  }

  // Global channels (owner_id IS NULL) always get notified — CC for super admins
  const globalChannels = await getActiveChannels(filter);
  for (const ch of globalChannels) {
    if (!results.includes(ch)) results.push(ch);
  }

  return results;
}

const fmtDate = fmtDateTelegram;

// ─── Core send helpers ─────────────────────────────────────────────────────

async function sendMessage(payload: object): Promise<void> {
  const res = await fetch(`${API(token())}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed: ${err}`);
  }
}

async function editMessageReplyMarkup(chatIdVal: string, messageId: number, replyMarkup: object | null): Promise<void> {
  await fetch(`${API(token())}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatIdVal,
      message_id: messageId,
      reply_markup: replyMarkup,
    }),
  });
}

async function editMessageText(chatIdVal: string, messageId: number, text: string): Promise<void> {
  await fetch(`${API(token())}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatIdVal,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false): Promise<void> {
  await fetch(`${API(token())}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
  });
}

// ─── Public functions ──────────────────────────────────────────────────────

/**
 * Send a new booking alert to the Telegram channel with Approve / Reject buttons.
 * Returns the sent message's message_id (store in booking record for later edits).
 */
export async function sendBookingAlert(booking: Booking, listing: Listing, overrideChatId?: string | null, ownerId?: string | null): Promise<number | null> {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  const ref = booking.id.slice(0, 8).toUpperCase();

  const guests = [
    booking.guests_adults > 0 ? `${booking.guests_adults} adult${booking.guests_adults > 1 ? 's' : ''}` : null,
    booking.guests_children > 0 ? `${booking.guests_children} child${booking.guests_children > 1 ? 'ren' : ''}` : null,
    booking.guests_infants > 0 ? `${booking.guests_infants} infant${booking.guests_infants > 1 ? 's' : ''}` : null,
    booking.guests_pets > 0 ? `${booking.guests_pets} pet${booking.guests_pets > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');

  const isDeposit   = (booking as any).payment_plan === 'deposit' || (booking as any).payment_type === 'deposit';
  const depositAmt  = (booking as any).deposit_amount ?? 0;
  const remaining   = isDeposit ? booking.total_price - depositAmt : 0;

  const priceLines = [
    `  Nightly total: <b>€${booking.base_total}</b>`,
    booking.extra_guest_fee > 0 ? `  Extra guests: <b>€${booking.extra_guest_fee}</b>` : null,
    `  Cleaning fee: <b>€${booking.cleaning_fee}</b>`,
    booking.coupon_discount > 0 ? `  Discount: <b>-€${booking.coupon_discount}</b>` : null,
    `  <b>TOTAL: €${booking.total_price} ${booking.currency}</b>`,
    isDeposit
      ? `  💳 Deposit on approval: <b>€${depositAmt}</b>\n  🏠 Remaining on arrival: <b>€${remaining}</b>`
      : `  💳 Full payment due`,
  ].filter(Boolean).join('\n');

  const text = [
    `🏡 <b>New Booking Request</b>`,
    `<b>${listing.title}</b>`,
    ``,
    `👤 <b>Guest</b>`,
    `  Name: <b>${booking.guest_name}</b>`,
    `  Email: ${booking.guest_email}`,
    booking.guest_phone ? `  Phone: ${booking.guest_phone}` : null,
    booking.guest_country ? `  From: ${booking.guest_country}` : null,
    ``,
    `📅 <b>Stay</b>`,
    `  Check-in: <b>${fmtDate(booking.check_in)}</b>`,
    `  Check-out: <b>${fmtDate(booking.check_out)}</b>`,
    `  Nights: <b>${booking.nights}</b>`,
    `  Guests: ${guests}`,
    ``,
    `💶 <b>Pricing</b>`,
    priceLines,
    ``,
    booking.guest_message ? `💬 <b>Message</b>\n  "${booking.guest_message}"\n` : null,
    `🔖 Ref: <code>${ref}</code>`,
    `<a href="${siteUrl}/admin/bookings/${booking.id}">Open in admin →</a>`,
  ].filter((l) => l !== null).join('\n');

  const channels = await resolveChannels('notify_booking_new', overrideChatId, ownerId);
  let firstMessageId: number | null = null;

  for (const chatIdVal of channels) {
    const payload = {
      chat_id: chatIdVal,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve:${booking.id}` },
            { text: '❌ Reject', callback_data: `reject:${booking.id}` },
          ],
        ],
      },
      link_preview_options: { is_disabled: true },
    };

    const res = await fetch(`${API(token())}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`Telegram alert failed for ${chatIdVal}:`, await res.text());
      continue;
    }

    const json = await res.json() as { ok: boolean; result: { message_id: number } };
    if (firstMessageId === null) firstMessageId = json.result?.message_id ?? null;
  }

  return firstMessageId;
}

/**
 * Update the original booking alert message after approve/reject.
 * Removes the buttons and appends a status line.
 */
export async function updateBookingAlertStatus(
  messageId: number,
  booking: Booking,
  listing: Listing,
  newStatus: 'confirmed' | 'cancelled',
  actorName?: string,
  overrideChatId?: string | null,
  ownerId?: string | null,
): Promise<void> {
  const ref = booking.id.slice(0, 8).toUpperCase();
  const statusLine = newStatus === 'confirmed'
    ? `\n\n✅ <b>APPROVED</b>${actorName ? ` by ${actorName}` : ''}`
    : `\n\n❌ <b>REJECTED</b>${actorName ? ` by ${actorName}` : ''}`;

  // Remove inline keyboard — use the listing's channel, then owner's, then first global
  const resolved = await resolveChannels('notify_booking_confirmed', overrideChatId, ownerId);
  const chatIdVal = resolved[0] ?? envChatId();
  await editMessageReplyMarkup(chatIdVal, messageId, null);

  // Append status to original message
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  const guests = [
    booking.guests_adults > 0 ? `${booking.guests_adults} adult${booking.guests_adults > 1 ? 's' : ''}` : null,
    booking.guests_children > 0 ? `${booking.guests_children} child${booking.guests_children > 1 ? 'ren' : ''}` : null,
  ].filter(Boolean).join(', ');

  const updatedText = [
    `🏡 <b>${newStatus === 'confirmed' ? 'Booking Approved' : 'Booking Rejected'}</b>`,
    `<b>${listing.title}</b>`,
    ``,
    `👤 ${booking.guest_name} (${booking.guest_email})`,
    `📅 ${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)} · ${booking.nights}n · ${guests}`,
    `💶 <b>€${booking.total_price} ${booking.currency}</b>`,
    `🔖 Ref: <code>${ref}</code>`,
    statusLine,
    `<a href="${siteUrl}/admin/bookings/${booking.id}">Open in admin →</a>`,
  ].join('\n');

  await editMessageText(chatIdVal, messageId, updatedText);
}

/**
 * Send a simple text notification (e.g. cancellation, payment received).
 */
export async function sendSimpleAlert(text: string, filter: keyof TelegramChannel = 'notify_booking_confirmed', overrideChatId?: string | null, ownerId?: string | null): Promise<void> {
  const channels = await resolveChannels(filter, overrideChatId, ownerId);
  for (const chatIdVal of channels) {
    try {
      await sendMessage({
        chat_id: chatIdVal,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    } catch (err) {
      console.error(`Telegram simple alert failed for ${chatIdVal}:`, err);
    }
  }
}

/**
 * Send a guest inquiry / message to the listing's Telegram channel.
 * Falls back to global channels if the listing has no dedicated channel.
 */
export async function sendInquiryAlert(params: {
  listingTitle: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  message: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  overrideChatId?: string | null;
  ownerId?: string | null;
}): Promise<void> {
  const { listingTitle, guestName, guestEmail, guestPhone, message, checkIn, checkOut, guests, overrideChatId, ownerId } = params;

  const lines = [
    `💬 <b>New Guest Message</b>`,
    `<b>${listingTitle}</b>`,
    ``,
    `👤 <b>Guest</b>`,
    `  Name: <b>${guestName}</b>`,
    `  Email: ${guestEmail}`,
    guestPhone ? `  📱 Phone: <b>${guestPhone}</b> (WhatsApp / Telegram / Viber)` : null,
    checkIn && checkOut ? `  Dates: <b>${fmtDate(checkIn)}</b> → <b>${fmtDate(checkOut)}</b>` : null,
    guests ? `  Guests: ${guests}` : null,
    ``,
    `📩 <b>Message</b>`,
    `  "${message}"`,
    ``,
    guestPhone
      ? `↩️ Reply via email <b>${guestEmail}</b> or call/WhatsApp <b>${guestPhone}</b>`
      : `↩️ Reply directly to <b>${guestEmail}</b>`,
  ].filter((l) => l !== null).join('\n');

  const channels = await resolveChannels('notify_booking_new', overrideChatId, ownerId);
  for (const chatIdVal of channels) {
    try {
      await sendMessage({
        chat_id: chatIdVal,
        text: lines,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    } catch (err) {
      console.error(`Telegram inquiry alert failed for ${chatIdVal}:`, err);
    }
  }
}

/**
 * Send a Telegram Direct booking alert to the owner channel.
 * Uses td_accept / td_decline callbacks (no payment info — direct contact model).
 */
export async function sendTelegramDirectAlert(
  booking: Booking,
  listing: Listing,
  overrideChatId?: string | null,
  ownerId?: string | null,
): Promise<number | null> {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  const ref = booking.id.slice(0, 8).toUpperCase();

  const guests = [
    booking.guests_adults > 0 ? `${booking.guests_adults} adult${booking.guests_adults > 1 ? 's' : ''}` : null,
    booking.guests_children > 0 ? `${booking.guests_children} child${booking.guests_children > 1 ? 'ren' : ''}` : null,
    booking.guests_infants > 0 ? `${booking.guests_infants} infant${booking.guests_infants > 1 ? 's' : ''}` : null,
    booking.guests_pets > 0 ? `${booking.guests_pets} pet${booking.guests_pets > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');

  const text = [
    `📬 <b>Direct Booking Request</b>  <i>(free · no platform payment)</i>`,
    `<b>${listing.title}</b>`,
    ``,
    `👤 <b>Guest</b>`,
    `  Name: <b>${booking.guest_name}</b>`,
    `  Email: ${booking.guest_email}`,
    booking.guest_phone ? `  Phone: <b>${booking.guest_phone}</b>` : null,
    booking.guest_country ? `  From: ${booking.guest_country}` : null,
    ``,
    `📅 <b>Stay</b>`,
    `  Check-in: <b>${fmtDate(booking.check_in)}</b>`,
    `  Check-out: <b>${fmtDate(booking.check_out)}</b>`,
    `  Nights: <b>${booking.nights}</b>`,
    `  Guests: ${guests}`,
    ``,
    (booking as any).payment_type === 'deposit' && (booking as any).deposit_amount
    ? `💶 Total: <b>€${booking.total_price} ${booking.currency}</b>  |  Deposit: <b>€${(booking as any).deposit_amount}</b> · Remaining: <b>€${(booking as any).remaining_amount}</b>`
    : `💶 Total: <b>€${booking.total_price} ${booking.currency}</b>  |  <b>Full payment</b>`,
    booking.guest_message ? `\n💬 "${booking.guest_message}"\n` : null,
    `🔖 Ref: <code>${ref}</code>`,
    `<a href="${siteUrl}/admin/bookings/${booking.id}">Open in admin →</a>`,
  ].filter((l) => l !== null).join('\n');

  // Build direct-contact URL buttons for the guest's phone
  // Note: tel: is not a valid URL scheme for Telegram inline keyboard buttons — omit it
  const phoneDigits = (booking.guest_phone ?? '').replace(/[^\d]/g, '');
  const contactRow = phoneDigits ? [
    { text: '💬 WhatsApp', url: `https://wa.me/${phoneDigits}` },
    { text: '📱 Telegram', url: `https://t.me/+${phoneDigits}` },
  ] : [];

  const inlineKeyboard = [
    [
      { text: '✅ Accept', callback_data: `td_accept:${booking.id}` },
      { text: '❌ Decline', callback_data: `td_decline:${booking.id}` },
    ],
    ...(contactRow.length ? [contactRow] : []),
  ];

  // For Telegram Direct, the owner opted in explicitly at the listing level — send to ALL
  // active owner channels regardless of their notify_booking_new flag.
  const channels = await resolveChannels(undefined, overrideChatId, ownerId);
  let firstMessageId: number | null = null;

  for (const chatIdVal of channels) {
    const res = await fetch(`${API(token())}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatIdVal,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard },
        link_preview_options: { is_disabled: true },
      }),
    });
    if (!res.ok) { console.error(`Telegram TD alert failed for ${chatIdVal}:`, await res.text()); continue; }
    const json = await res.json() as { ok: boolean; result: { message_id: number } };
    if (firstMessageId === null) firstMessageId = json.result?.message_id ?? null;
  }
  return firstMessageId;
}

/**
 * Push a plain text message to a specific Telegram chat_id (e.g. a guest).
 */
export async function sendMessageToChat(chatId: string | number, text: string): Promise<void> {
  try {
    await sendMessage({
      chat_id: String(chatId),
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error(`sendMessageToChat(${chatId}) failed:`, err);
  }
}

/**
 * Answer a callback query from Telegram (must be called within 10 seconds).
 */
export { answerCallbackQuery };

/**
 * Register this server's webhook URL with Telegram.
 * Call once after deployment: GET /api/telegram/register
 */
/**
 * Send a restaurant reservation alert with Confirm/Reject inline buttons.
 * Returns the message_id for later edits.
 */
export async function sendReservationAlert(reservation: any, restaurant: any): Promise<number | null> {
  const chatId = restaurant.telegram_chat_id;
  if (!chatId) return null;

  const ref = reservation.id.slice(0, 8).toUpperCase();
  const text = [
    `🍽️ <b>New Reservation</b>`,
    `<b>${restaurant.name}</b>`,
    ``,
    `👤 <b>Guest</b>`,
    `  Name: <b>${reservation.guest_name}</b>`,
    reservation.guest_phone ? `  Phone: ${reservation.guest_phone}` : null,
    reservation.guest_email ? `  Email: ${reservation.guest_email}` : null,
    ``,
    `📅 <b>Details</b>`,
    `  Date: <b>${reservation.date}</b>`,
    `  Time: <b>${reservation.time_slot}</b>`,
    `  Guests: <b>${reservation.guest_count}</b>`,
    ``,
    reservation.special_requests ? `💬 <b>Special Requests</b>\n  "${reservation.special_requests}"\n` : null,
    `🔖 Ref: <code>${ref}</code>`,
  ].filter(l => l !== null).join('\n');

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Confirm', callback_data: `res_confirm:${reservation.id}` },
          { text: '❌ Reject', callback_data: `res_reject:${reservation.id}` },
        ],
      ],
    },
  };

  try {
    const res = await fetch(`${API(token())}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json.result?.message_id ?? null;
  } catch {
    return null;
  }
}

export async function registerWebhook(webhookUrl: string): Promise<void> {
  const secret = import.meta.env.TELEGRAM_WEBHOOK_SECRET;
  const res = await fetch(`${API(token())}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['callback_query', 'message'],
      drop_pending_updates: true,
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`setWebhook failed: ${JSON.stringify(json)}`);
}
