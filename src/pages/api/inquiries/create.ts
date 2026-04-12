import type { APIRoute } from 'astro';
import { InquirySchema } from '../../../lib/validators.ts';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendInquiryAlert } from '../../../lib/telegram.ts';
import { Resend } from 'resend';
import { inquiryLimiter, getClientIp, rateLimitResponse } from '../../../lib/rate-limit.ts';

// ── Disposable / throwaway email domains ──────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.biz','guerrillamail.de','sharklasers.com','guerrillamailblock.com',
  'grr.la','guerrillamailblock.com','spam4.me','trashmail.com','trashmail.me',
  'trashmail.net','trashmail.at','trashmail.io','trashmail.org','dispostable.com',
  'yopmail.com','yopmail.fr','cool.fr.nf','jetable.fr.nf','nospam.ze.tc',
  'nomail.xl.cx','mega.zik.dj','speed.1s.fr','courriel.fr.nf','moncourrier.fr.nf',
  'monemail.fr.nf','monmail.fr.nf','tempmail.com','temp-mail.org','fakeinbox.com',
  'throwam.com','maildrop.cc','spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'mailnull.com','spamspot.com','spamthisplease.com','tempr.email','discard.email',
  'mailnesia.com','mailnull.com','spamgrap.com','getnada.com','mohmal.com',
  '10minutemail.com','10minutemail.net','10minutemail.org','tempail.com',
  'tempemail.net','throwaway.email','throwam.com','spamherelots.com',
]);

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request }) => {
  // ── Honeypot check ──────────────────────────────────────────────────────────
  // The 'website' field is hidden from humans; bots fill it in.
  const body = await request.json();
  if (body.website) return json({ success: true }); // silently drop

  // ── Rate limit by IP ────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  if (!inquiryLimiter.check(ip)) {
    return rateLimitResponse('Too many requests. Please wait before sending another message.');
  }

  // ── Validate input ──────────────────────────────────────────────────────────
  // Strip empty strings for optional date fields so the regex doesn't reject them
  if (body.check_in  === '') body.check_in  = undefined;
  if (body.check_out === '') body.check_out = undefined;
  const parsed = InquirySchema.safeParse(body);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return json({ error: firstError ?? 'Invalid input' }, 400);
  }

  // ── Block disposable email domains ──────────────────────────────────────────
  const emailDomain = parsed.data.email.split('@')[1]?.toLowerCase();
  if (emailDomain && DISPOSABLE_DOMAINS.has(emailDomain)) {
    return json({ error: 'Please use a real email address so the host can reply to you.' }, 400);
  }

  const service = getServiceClient();
  const { data, error } = await service.from('inquiries').insert(parsed.data).select().single();
  if (error) return json({ error: 'Failed to submit inquiry' }, 500);

  // ── Resolve listing title + Telegram channel ────────────────────────────────
  let listingTitle = 'Unknown property';
  let listingChatId: string | null = null;
  let listingOwnerId: string | null = null;

  if (parsed.data.listing_id) {
    const { data: listing } = await service
      .from('listings')
      .select('title, owner_id, telegram_channels(chat_id)')
      .eq('id', parsed.data.listing_id)
      .single();
    if (listing) {
      listingTitle = listing.title;
      listingChatId = (listing as any).telegram_channels?.chat_id ?? null;
      listingOwnerId = (listing as any).owner_id ?? null;
    }
  }

  // ── Telegram notification ───────────────────────────────────────────────────
  try {
    await sendInquiryAlert({
      listingTitle,
      guestName: parsed.data.name,
      guestEmail: parsed.data.email,
      guestPhone: parsed.data.phone ?? null,
      message: parsed.data.message,
      checkIn: parsed.data.check_in ?? null,
      checkOut: parsed.data.check_out ?? null,
      guests: parsed.data.guests ?? null,
      overrideChatId: listingChatId,
      ownerId: listingOwnerId,
    });
  } catch { /* non-fatal */ }

  // ── Email notification ──────────────────────────────────────────────────────
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    await resend.emails.send({
      from: import.meta.env.EMAIL_FROM,
      to: import.meta.env.EMAIL_OWNER,
      subject: `New inquiry from ${parsed.data.name} – ${listingTitle}`,
      html: `<p><strong>Property:</strong> ${listingTitle}<br><strong>From:</strong> ${parsed.data.name} (${parsed.data.email})${parsed.data.phone ? `<br><strong>Phone/WhatsApp:</strong> ${parsed.data.phone}` : ''}<br><strong>Message:</strong> ${parsed.data.message}${parsed.data.check_in ? `<br><strong>Dates:</strong> ${parsed.data.check_in} → ${parsed.data.check_out}` : ''}</p>`,
    });
  } catch { /* non-fatal */ }

  return json({ success: true, id: data.id }, 201);
};
