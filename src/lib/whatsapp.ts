import { getEnv } from './env.ts';

/**
 * WhatsApp Cloud API helper.
 * Requires env vars: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
 *
 * For Viber, we generate deep links (no business API needed).
 * For Telegram, we generate deep links (bot API can't initiate chats).
 */

function getWhatsAppConfig() {
  const env = getEnv();
  return {
    phoneNumberId: (env as any).WHATSAPP_PHONE_NUMBER_ID as string | undefined,
    accessToken: (env as any).WHATSAPP_ACCESS_TOKEN as string | undefined,
  };
}

/** Normalize phone to international format (strip spaces, ensure +) */
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, '');
  // Greek numbers: if starts with 69, prepend +30
  if (p.startsWith('69')) p = '+30' + p;
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}

/** Strip + for WhatsApp API (expects country code without +) */
function whatsappPhone(phone: string): string {
  return normalizePhone(phone).replace(/^\+/, '');
}

/**
 * Send a WhatsApp text message via Cloud API.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  const { phoneNumberId, accessToken } = getWhatsAppConfig();
  if (!phoneNumberId || !accessToken) return false;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: whatsappPhone(to),
          type: 'text',
          text: { body: text },
        }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error('WhatsApp send failed:', e);
    return false;
  }
}

/**
 * Generate a WhatsApp click-to-chat URL (works without API).
 * Falls back to this when Cloud API is not configured.
 */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${whatsappPhone(phone)}?text=${encodeURIComponent(text)}`;
}

/** Generate a Viber deep link */
export function viberLink(phone: string, text: string): string {
  return `viber://chat?number=${encodeURIComponent(normalizePhone(phone))}&text=${encodeURIComponent(text)}`;
}

/** Generate a Telegram deep link (requires username — fallback to phone) */
export function telegramLink(phone: string, text: string): string {
  // Telegram doesn't support sending to phone numbers via deep link easily,
  // use the web share approach
  return `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
}

// ── Reservation notification messages ──────────────────────────────────────

function reservationReceivedMsg(reservation: any, restaurant: any): string {
  return [
    `🍽️ ${restaurant.name} — Reservation Received`,
    ``,
    `Hi ${reservation.guest_name}!`,
    `Your reservation request has been received:`,
    ``,
    `📅 Date: ${reservation.date}`,
    `🕐 Time: ${reservation.time_slot}`,
    `👥 Guests: ${reservation.guest_count}`,
    ``,
    `⏳ Status: Pending confirmation`,
    `We'll notify you once the restaurant confirms your table.`,
    ``,
    `Ref: ${reservation.id.slice(0, 8).toUpperCase()}`,
  ].join('\n');
}

function reservationConfirmedMsg(reservation: any, restaurant: any): string {
  return [
    `✅ ${restaurant.name} — Reservation Confirmed!`,
    ``,
    `Hi ${reservation.guest_name}!`,
    `Great news — your table is confirmed:`,
    ``,
    `📅 Date: ${reservation.date}`,
    `🕐 Time: ${reservation.time_slot}`,
    `👥 Guests: ${reservation.guest_count}`,
    ``,
    `We look forward to seeing you!`,
    restaurant.address ? `📍 ${restaurant.address}${restaurant.city ? `, ${restaurant.city}` : ''}` : '',
    ``,
    `Ref: ${reservation.id.slice(0, 8).toUpperCase()}`,
  ].filter(Boolean).join('\n');
}

function reservationCancelledMsg(reservation: any, restaurant: any): string {
  return [
    `❌ ${restaurant.name} — Reservation Cancelled`,
    ``,
    `Hi ${reservation.guest_name},`,
    `Unfortunately, your reservation for ${reservation.date} at ${reservation.time_slot} has been cancelled.`,
    ``,
    `Please feel free to make a new reservation or contact the restaurant directly.`,
    ``,
    `Ref: ${reservation.id.slice(0, 8).toUpperCase()}`,
  ].join('\n');
}

/**
 * Send a reservation notification to the guest via their preferred channel.
 * type: 'received' | 'confirmed' | 'cancelled'
 */
export async function sendGuestNotification(
  reservation: any,
  restaurant: any,
  type: 'received' | 'confirmed' | 'cancelled'
): Promise<boolean> {
  const pref = reservation.contact_preference ?? 'whatsapp';
  const phone = reservation.guest_phone;
  if (!phone) return false;

  const msgFn = type === 'received' ? reservationReceivedMsg
    : type === 'confirmed' ? reservationConfirmedMsg
    : reservationCancelledMsg;

  const text = msgFn(reservation, restaurant);

  if (pref === 'whatsapp') {
    // Try Cloud API first, fall back to nothing (owner sees link in dashboard)
    return sendWhatsAppMessage(phone, text);
  }

  // Viber and Telegram don't have free APIs for sending to arbitrary numbers.
  // The notification will be handled by the owner via quick-action links in the dashboard.
  // We still send email as fallback.
  return false;
}

/**
 * Generate a quick-message link for the owner to contact the guest.
 */
export function getQuickMessageLink(
  phone: string,
  text: string,
  platform: 'whatsapp' | 'viber' | 'telegram'
): string {
  switch (platform) {
    case 'whatsapp': return whatsappLink(phone, text);
    case 'viber': return viberLink(phone, text);
    case 'telegram': return telegramLink(phone, text);
  }
}
