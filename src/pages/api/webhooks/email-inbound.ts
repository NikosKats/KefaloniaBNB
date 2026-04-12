/**
 * POST /api/webhooks/email-inbound
 *
 * Handles Resend `email.received` webhook events.
 * When an email arrives at info@kefaloniabnb.com, Resend sends this webhook.
 * We fetch the full email body from the Resend API and forward it to EMAIL_OWNER.
 *
 * Setup steps (one-time, manual):
 *  1. In Resend dashboard → Domains → kefaloniabnb.com → add the MX record shown
 *  2. In Resend dashboard → Webhooks → Add Webhook
 *       URL: https://kefaloniabnb.com/api/webhooks/email-inbound
 *       Event: email.received
 *  3. Copy the webhook signing secret and add it as RESEND_WEBHOOK_SECRET env var
 *     in Cloudflare Workers (Settings → Variables).
 */

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const J = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request }) => {
  const apiKey   = import.meta.env.RESEND_API_KEY as string;
  const secret   = import.meta.env.RESEND_WEBHOOK_SECRET as string | undefined;
  const toEmail  = import.meta.env.EMAIL_OWNER as string; // nikolaos.katsilidis@gmail.com
  const fromAddr = import.meta.env.EMAIL_FROM  as string; // noreply@kefaloniabnb.com

  // ── Signature verification ────────────────────────────────────────────────
  if (secret) {
    const svixId        = request.headers.get('svix-id') ?? '';
    const svixTimestamp = request.headers.get('svix-timestamp') ?? '';
    const svixSignature = request.headers.get('svix-signature') ?? '';

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response(JSON.stringify({ error: 'Missing svix headers' }), { status: 400, headers: J });
    }

    try {
      const resend = new Resend(apiKey);
      const rawBody = await request.text();
      resend.webhooks.verify({
        payload: rawBody,
        headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
        secret,
      });
      // Re-parse after reading as text
      const event = JSON.parse(rawBody);
      return handleEvent(event, apiKey, fromAddr, toEmail);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: J });
    }
  }

  // No secret configured yet — accept without verification (set RESEND_WEBHOOK_SECRET asap)
  const event = await request.json();
  return handleEvent(event, apiKey, fromAddr, toEmail);
};

async function handleEvent(
  event: any,
  apiKey: string,
  fromAddr: string,
  toEmail: string,
): Promise<Response> {
  if (event.type !== 'email.received') {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
  }

  const { email_id, from, to, subject, attachments } = event.data ?? {};

  // ── Fetch full email body from Resend ─────────────────────────────────────
  let bodyHtml = '';
  let bodyText = '';
  try {
    const res = await fetch(`https://api.resend.com/emails/${email_id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json() as any;
      bodyHtml = data.html ?? '';
      bodyText = data.text ?? '';
    }
  } catch { /* non-fatal — fall back to metadata-only forward */ }

  // ── Build the forwarded email ─────────────────────────────────────────────
  const fromDisplay = from ?? 'Unknown sender';
  const subjectLine = subject ? `FWD: ${subject}` : 'New email received at info@kefaloniabnb.com';
  const recipients  = Array.isArray(to) ? to.join(', ') : (to ?? 'info@kefaloniabnb.com');

  const fwdHtml = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
  <div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin-bottom:20px;font-size:13px;color:#555">
    <strong>Forwarded message received at info@kefaloniabnb.com</strong><br/>
    <strong>From:</strong> ${escHtml(fromDisplay)}<br/>
    <strong>To:</strong> ${escHtml(recipients)}<br/>
    <strong>Subject:</strong> ${escHtml(subject ?? '(no subject)')}
    ${(attachments ?? []).length > 0
      ? `<br/><strong>Attachments:</strong> ${(attachments as any[]).map((a: any) => escHtml(a.filename ?? a.id)).join(', ')}`
      : ''}
  </div>
  ${bodyHtml
    ? `<div style="font-size:15px;line-height:1.6;color:#111">${bodyHtml}</div>`
    : `<pre style="font-size:14px;white-space:pre-wrap;color:#111">${escHtml(bodyText || '(no body retrieved)')}</pre>`
  }
</div>`;

  // ── Forward via Resend ────────────────────────────────────────────────────
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromAddr,
      to: toEmail,
      reply_to: fromDisplay,
      subject: subjectLine,
      html: fwdHtml,
    });
  } catch (err) {
    console.error('[email-inbound] forward failed:', err);
    return new Response(JSON.stringify({ error: 'Forward failed' }), { status: 500, headers: J });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
