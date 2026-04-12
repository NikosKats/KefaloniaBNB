import { Resend } from 'resend';
import type { Booking, Listing } from '../types/index.ts';
import { getEnv } from './env.ts';
import { fmtDateLong as fmtDate } from './format.ts';

function getResend() {
  return new Resend(getEnv().RESEND_API_KEY);
}

function fmtCurrency(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n);
}

function baseEmailHtml(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <tr><td style="background:#1a1a2e;padding:32px 40px;">
        <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">KefaloniaBNB</p>
        <p style="margin:4px 0 0;color:#a0aec0;font-size:13px;">Direct Booking Confirmation</p>
      </td></tr>
      <tr><td style="padding:40px;">${body}</td></tr>
      <tr><td style="background:#f8f8f9;padding:24px 40px;border-top:1px solid #e8e8eb;">
        <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">Questions? Reply to this email. We typically respond within a few hours.<br>KefaloniaBNB · Keramoti, Greece · ${import.meta.env.PUBLIC_SITE_URL}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export async function sendBookingReceived(booking: Booking, listing: Listing, ownerEmail?: string | null, _paymentDetails?: PaymentDetails) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const ref = booking.id.slice(0, 8).toUpperCase();

  const isDeposit    = (booking as any).payment_type === 'deposit';
  const depositAmt   = (booking as any).deposit_amount ?? 0;
  const remainingAmt = isDeposit ? booking.total_price - depositAmt : 0;

  const paymentRows = isDeposit
    ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total stay</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>
       <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Deposit on approval</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(depositAmt, booking.currency)}</td></tr>
       <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Remaining due on arrival</strong></td><td style="padding:6px 0;color:#6b7280;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(remainingAmt, booking.currency)}</td></tr>`
    : `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total amount</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>`;

  const guestHtml = baseEmailHtml(
    'Booking Request Received',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Thank you, ${booking.guest_name.split(' ')[0]}!</h2>
    <p style="margin:0 0 24px;color:#6b7280;">We've received your booking request for <strong>${listing.title}</strong>. We'll review it and send you a confirmation with payment details shortly.</p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Check-in</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${fmtDate(booking.check_in)} from ${listing.check_in_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Check-out</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtDate(booking.check_out)} by ${listing.check_out_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Guests</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${booking.guests_adults + booking.guests_children}</td></tr>
      ${paymentRows}
    </table>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Booking reference: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${ref}</code></p>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">You'll receive a confirmation email with payment details once your booking is approved, typically within a few hours.</p>
    ${(booking as any).guest_token ? `<a href="${siteUrl}/my-booking?token=${(booking as any).guest_token}" style="display:inline-block;background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;">View or manage your booking →</a>` : ''}`
  );

  const ownerHtml = baseEmailHtml(
    'New Booking Request',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">New Booking Request</h2>
    <p style="margin:0 0 24px;color:#6b7280;">${listing.title}</p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Guest</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${booking.guest_name}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Email</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${booking.guest_email}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Phone</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${booking.guest_phone ?? '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Dates</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${booking.check_in} → ${booking.check_out} (${booking.nights}n)</td></tr>
      ${isDeposit
        ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total stay</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>
           <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Deposit due on approval</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(depositAmt, booking.currency)}</td></tr>
           <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Remaining due on arrival</strong></td><td style="padding:6px 0;color:#6b7280;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(remainingAmt, booking.currency)}</td></tr>`
        : `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total amount due</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>`}
    </table>
    ${booking.guest_message ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;"><strong>Message:</strong> ${booking.guest_message}</p>` : ''}
    <a href="${siteUrl}/admin/bookings/${booking.id}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Manage Booking →</a>`
  );

  await Promise.all([
    resend.emails.send({
      from: import.meta.env.EMAIL_FROM,
      to: booking.guest_email,
      subject: `Booking request received – ${listing.title}`,
      html: guestHtml,
    }),
    resend.emails.send({
      from: import.meta.env.EMAIL_FROM,
      to: ownerEmail || import.meta.env.EMAIL_OWNER,
      subject: `[New Booking] ${booking.guest_name} · ${booking.check_in} → ${booking.check_out}`,
      html: ownerHtml,
    }),
  ]);
}

export async function sendBookingConfirmed(booking: Booking, listing: Listing) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  const html = baseEmailHtml(
    'Booking Confirmed',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Your booking is confirmed! 🎉</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${booking.guest_name.split(' ')[0]}, your stay at <strong>${listing.title}</strong> is confirmed.</p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Check-in</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${fmtDate(booking.check_in)} from ${listing.check_in_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Check-out</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtDate(booking.check_out)} by ${listing.check_out_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Address</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${listing.address}, ${listing.city}, ${listing.country}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total paid</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">You'll receive check-in instructions 48 hours before your arrival.</p>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Booking reference: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${booking.id.slice(0,8).toUpperCase()}</code></p>
    ${(booking as any).guest_token ? `<a href="${siteUrl}/my-booking?token=${(booking as any).guest_token}" style="display:inline-block;background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;">View or manage your booking →</a>` : ''}`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: booking.guest_email,
    subject: `Booking confirmed – ${listing.title}`,
    html,
  });
}

/**
 * Sent to guest when their bank-transfer booking request is approved.
 * Includes Revolut, Wise, and IBAN details from env vars.
 */
export interface PaymentDetails {
  payment_account_name?: string | null;
  payment_revolut?:      string | null;
  payment_wise?:         string | null;
  payment_iban?:         string | null;
  payment_bic?:          string | null;
}

export async function sendBankTransferDetails(booking: Booking, listing: Listing, paymentDetails?: PaymentDetails, ownerEmail?: string | null) {
  const resend = getResend();
  const ref    = booking.id.slice(0, 8).toUpperCase();

  // DB values take priority; fall back to env vars, then hardcoded defaults
  const revolut   = paymentDetails?.payment_revolut      || import.meta.env.BANK_REVOLUT      || '@kefaloniabnb';
  const wise      = paymentDetails?.payment_wise         || import.meta.env.BANK_WISE         || 'payments@email.com';
  const iban      = paymentDetails?.payment_iban         || import.meta.env.BANK_IBAN         || 'GR0000000000000000000000000';
  const bic       = paymentDetails?.payment_bic          || import.meta.env.BANK_BIC          || 'ETHNGRAA';
  const accName   = paymentDetails?.payment_account_name || import.meta.env.BANK_ACCOUNT_NAME || 'KefaloniaBNB';
  const siteUrl   = import.meta.env.PUBLIC_SITE_URL ?? '';

  const transferRows = [
    revolut ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Revolut</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${revolut}</td></tr>` : '',
    wise    ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Wise</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${wise}</td></tr>` : '',
    iban    ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>IBAN</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;font-family:monospace;">${iban}</td></tr>` : '',
    bic     ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>BIC / SWIFT</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${bic}</td></tr>` : '',
  ].filter(Boolean).join('');

  const isDeposit    = (booking as any).payment_type === 'deposit';
  const depositAmt   = (booking as any).deposit_amount ?? 0;
  const remainingAmt = isDeposit ? booking.total_price - depositAmt : 0;
  const amountDue    = isDeposit ? depositAmt : booking.total_price;

  const depositRows = isDeposit
    ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total stay</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>
       <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Deposit due now</strong></td><td style="padding:6px 0;color:#111;font-size:18px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(depositAmt, booking.currency)}</td></tr>
       <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Remaining due on arrival</strong></td><td style="padding:6px 0;color:#6b7280;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(remainingAmt, booking.currency)}</td></tr>`
    : `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total amount due</strong></td><td style="padding:6px 0;color:#111;font-size:18px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>`;

  const html = baseEmailHtml(
    'Booking Approved — Bank Transfer Details',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Your booking is approved! 🎉</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${booking.guest_name.split(' ')[0]}, great news — your booking request for <strong>${listing.title}</strong> has been approved. Please complete your payment by bank transfer to secure your stay.</p>

    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Check-in</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${fmtDate(booking.check_in)} from ${listing.check_in_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Check-out</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtDate(booking.check_out)} by ${listing.check_out_time}</td></tr>
      ${depositRows}
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Reference</strong></td><td style="padding:6px 0;text-align:right;border-top:1px solid #e5e7eb;"><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:14px;">${ref}</code></td></tr>
    </table>

    <h3 style="margin:0 0 12px;font-size:16px;color:#111;">Bank Transfer Details</h3>
    <table width="100%" style="background:#f0fdf4;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Account name</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${accName}</td></tr>
      ${transferRows}
    </table>

    <p style="margin:0 0 16px;color:#374151;font-size:14px;background:#fef9c3;border-radius:8px;padding:12px;">
      ⚠️ <strong>Important:</strong> Please transfer <strong>${fmtCurrency(amountDue, booking.currency)}</strong> and include your booking reference <code style="background:#fef08a;padding:1px 4px;border-radius:3px;">${ref}</code> in the payment description so we can match your transfer.
    </p>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">${isDeposit ? `Once we confirm receipt of the deposit, your booking is secured. The remaining ${fmtCurrency(remainingAmt, booking.currency)} is due on arrival.` : `Once we confirm receipt of the full amount, you'll get a final booking confirmation.`} Transfers are usually processed within 1–2 business days.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Questions? Just reply to this email.</p>`
  );

  // Also notify owner
  const ownerHtml = baseEmailHtml(
    'Bank Transfer Booking Approved',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Bank Transfer Booking Approved</h2>
    <p style="margin:0 0 8px;color:#6b7280;">Bank transfer details sent to <strong>${booking.guest_email}</strong>.</p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;"><strong>${listing.title}</strong> · ${booking.check_in} → ${booking.check_out} · ${fmtCurrency(booking.total_price, booking.currency)}</p>
    <a href="${siteUrl}/admin/bookings/${booking.id}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Booking →</a>`
  );

  await Promise.all([
    resend.emails.send({
      from: import.meta.env.EMAIL_FROM,
      to: booking.guest_email,
      subject: `Booking approved – payment details for ${listing.title}`,
      html,
    }),
    resend.emails.send({
      from: import.meta.env.EMAIL_FROM,
      to: ownerEmail || import.meta.env.EMAIL_OWNER,
      subject: `[Bank Transfer Approved] ${booking.guest_name} · ${booking.check_in} → ${booking.check_out}`,
      html: ownerHtml,
    }),
  ]);
}

export async function sendBookingPaid(booking: Booking, listing: Listing) {
  const resend = getResend();
  const ref = booking.id.slice(0, 8).toUpperCase();
  const html = baseEmailHtml(
    'Payment Received — Booking Confirmed',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Payment received — you're all set! 🎉</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${booking.guest_name.split(' ')[0]}, we've received your bank transfer for <strong>${listing.title}</strong>. Your booking is fully confirmed.</p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Check-in</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${fmtDate(booking.check_in)} from ${listing.check_in_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Check-out</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtDate(booking.check_out)} by ${listing.check_out_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Address</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${listing.address ?? ''}, ${listing.city ?? ''}, ${listing.country}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Amount paid</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">You'll receive check-in instructions 48 hours before your arrival.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Booking reference: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${ref}</code></p>`
  );
  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: booking.guest_email,
    subject: `Payment confirmed – ${listing.title}`,
    html,
  });
}

export async function sendDepositReceived(booking: Booking, listing: Listing) {
  const resend = getResend();
  const ref = booking.id.slice(0, 8).toUpperCase();
  const remaining = (booking as any).remaining_amount ?? (booking.total_price - (booking as any).deposit_amount ?? 0);
  const depositPaid = (booking as any).deposit_amount ?? (booking as any).amount_paid ?? 0;

  const html = baseEmailHtml(
    'Deposit Received — Booking Confirmed',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Deposit received — you're confirmed! 🎉</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${booking.guest_name.split(' ')[0]}, your deposit for <strong>${listing.title}</strong> has been received and your booking is confirmed.</p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Check-in</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${fmtDate(booking.check_in)} from ${listing.check_in_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Check-out</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtDate(booking.check_out)} by ${listing.check_out_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Address</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${listing.address ?? ''}, ${listing.city ?? ''}, ${listing.country}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Deposit paid</strong></td><td style="padding:6px 0;color:#059669;font-size:14px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">€${depositPaid.toFixed(2)}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Remaining on arrival</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">€${remaining.toFixed(2)}</td></tr>
    </table>
    <div style="background:#fef9c3;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;color:#92400e;font-size:13px;">💳 The remaining balance of <strong>€${remaining.toFixed(2)}</strong> is due in cash or card on arrival. Please have it ready for check-in.</p>
    </div>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">You'll receive check-in instructions 48 hours before your arrival.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Booking reference: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${ref}</code></p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: booking.guest_email,
    subject: `Deposit confirmed – ${listing.title}`,
    html,
  });
}

export async function sendCheckinInstructions(booking: Booking, listing: Listing & { checkin_instructions?: string | null }) {
  const resend = getResend();
  const ref = booking.id.slice(0, 8).toUpperCase();
  const firstName = booking.guest_name.split(' ')[0];

  const instructionsBlock = listing.checkin_instructions
    ? `<div style="background:#f0fdf4;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#166534;">Check-in Instructions</p>
        <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${listing.checkin_instructions}</p>
      </div>`
    : '';

  const html = baseEmailHtml(
    'Your check-in is in 2 days',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">See you soon, ${firstName}! 🏠</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Your stay at <strong>${listing.title}</strong> is just 2 days away. Here's everything you need for a smooth arrival.</p>

    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Check-in</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${fmtDate(booking.check_in)} from <strong>${listing.check_in_time}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Check-out</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtDate(booking.check_out)} by <strong>${listing.check_out_time}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Address</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${listing.address ?? ''}, ${listing.city ?? ''}, ${listing.country}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Guests</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${booking.guests_adults + booking.guests_children}</td></tr>
    </table>

    ${instructionsBlock}

    ${listing.house_rules ? `<div style="background:#fff7ed;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#9a3412;">House Rules</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${listing.house_rules}</p>
    </div>` : ''}

    <p style="margin:0;color:#6b7280;font-size:13px;">Booking reference: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${ref}</code> · Any questions? Just reply to this email.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: booking.guest_email,
    subject: `Check-in in 2 days – ${listing.title}`,
    html,
  });
}

export async function sendNewCleaningRequestEmail(
  cleanerEmail: string,
  cleanerName: string,
  request: { id: string; requested_date: string; earliest_time: string; latest_time: string; notes?: string | null },
  listing: { title: string; city?: string | null; bedrooms?: number | null; property_type?: string | null }
) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';

  const html = baseEmailHtml(
    'New Cleaning Job Available',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">New cleaning job available! 🧹</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${cleanerName.split(' ')[0]}, a new cleaning request just came in. Be the first to bid!</p>

    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Property</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${listing.title}</td></tr>
      ${listing.city ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Location</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${listing.city}</td></tr>` : ''}
      ${listing.bedrooms ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Size</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${listing.bedrooms} BR ${listing.property_type ?? ''}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Date</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${request.requested_date}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Time window</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${request.earliest_time} – ${request.latest_time}</td></tr>
    </table>

    ${request.notes ? `<div style="background:#f0f9ff;border-radius:8px;padding:14px 16px;margin-bottom:24px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0369a1;">Notes from owner</p><p style="margin:0;font-size:14px;color:#374151;">${request.notes}</p></div>` : ''}

    <a href="${siteUrl}/cleaner/requests/${request.id}" style="display:inline-block;background:#c9a96e;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View & Place Bid →</a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Log in to your cleaner portal to submit your price and availability.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: cleanerEmail,
    subject: `New cleaning job – ${listing.title} on ${request.requested_date}`,
    html,
  });
}

export async function sendBidReceivedEmail(
  ownerEmail: string,
  ownerName: string,
  bid: { proposed_price: number; proposed_time?: string | null; message?: string | null },
  request: { id: string; requested_date: string; earliest_time: string; latest_time: string },
  listing: { title: string; city?: string | null }
) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';

  const html = baseEmailHtml(
    'New Bid on Your Cleaning Request',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">New bid received! 🧹</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${ownerName.split(' ')[0]}, a cleaner has submitted a bid for your cleaning request at <strong>${listing.title}</strong>.</p>

    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Property</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${listing.title}${listing.city ? ` · ${listing.city}` : ''}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Cleaning Date</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${request.requested_date} · ${request.earliest_time}–${request.latest_time}</td></tr>
      ${bid.proposed_time ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Proposed Start</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${bid.proposed_time}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Bid Amount</strong></td><td style="padding:6px 0;color:#059669;font-size:18px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">€${bid.proposed_price}</td></tr>
    </table>

    ${bid.message ? `<div style="background:#f0f9ff;border-radius:8px;padding:16px;margin-bottom:24px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#075985;">Message from cleaner</p><p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${bid.message}"</p></div>` : ''}

    <a href="${siteUrl}/owner/cleaning/requests/${request.id}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review & Accept Bid →</a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Log in to your owner portal to review all bids and accept the one that suits you best.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: ownerEmail,
    subject: `New bid €${bid.proposed_price} on your cleaning request – ${listing.title}`,
    html,
  });
}

export async function sendCleanerInvite(email: string, fullName: string, inviteLink: string) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;

  const html = baseEmailHtml(
    "You've been invited as a Cleaner Partner",
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Welcome, ${fullName.split(' ')[0]}! 🧹</h2>
    <p style="margin:0 0 24px;color:#6b7280;">You've been invited to join the <strong>KefaloniaBNB</strong> cleaner network. Click the button below to set your password and start receiving cleaning job requests.</p>
    <a href="${inviteLink}" style="display:inline-block;background:#c9a96e;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Set your password →</a>
    <div style="margin-top:24px;background:#f9fafb;border-radius:8px;padding:16px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">What happens next:</p>
      <ol style="margin:0;padding-left:20px;color:#6b7280;font-size:13px;line-height:2;">
        <li>Set your password using the button above</li>
        <li>Complete your cleaner profile (service areas, pricing)</li>
        <li>Connect your Stripe account to receive payments</li>
        <li>Browse and bid on open cleaning requests</li>
      </ol>
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">This link expires in 24 hours. If you weren't expecting this invitation, you can safely ignore this email.</p>
    <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Or copy this URL into your browser:<br><span style="word-break:break-all;">${inviteLink}</span></p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: email,
    subject: "You've been invited to join KefaloniaBNB as a Cleaner",
    html,
  });
}

export async function sendOwnerInvite(email: string, fullName: string, inviteLink: string) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;

  const html = baseEmailHtml(
    "You've been invited to KefaloniaBNB",
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Welcome to KefaloniaBNB, ${fullName.split(' ')[0]}!</h2>
    <p style="margin:0 0 24px;color:#6b7280;">You've been invited as a property owner on <strong>KefaloniaBNB</strong>. Click the button below to set your password and activate your account.</p>
    <a href="${inviteLink}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Set your password →</a>
    <div style="margin-top:24px;background:#f9fafb;border-radius:8px;padding:16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">By activating your account you agree to the KefaloniaBNB platform policies:</p>
      <ul style="margin:0;padding-left:20px;color:#6b7280;font-size:13px;line-height:2;">
        <li><a href="${siteUrl}/terms" style="color:#1a1a2e;text-decoration:underline;">Terms &amp; Conditions</a></li>
        <li><a href="${siteUrl}/privacy-policy" style="color:#1a1a2e;text-decoration:underline;">Privacy Policy</a></li>
        <li><a href="${siteUrl}/cancellation-policy" style="color:#1a1a2e;text-decoration:underline;">Cancellation Policy</a></li>
      </ul>
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">This link expires in 24 hours. If you weren't expecting this invitation, you can safely ignore this email.</p>
    <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Or copy this URL into your browser:<br><span style="word-break:break-all;">${inviteLink}</span></p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: email,
    subject: "You've been invited to KefaloniaBNB",
    html,
  });
}

export async function sendReviewRequest(booking: Booking, listing: Listing, reviewToken: string) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  const firstName = booking.guest_name.split(' ')[0];

  const html = baseEmailHtml(
    'How was your stay?',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">How was your stay, ${firstName}? ⭐</h2>
    <p style="margin:0 0 24px;color:#6b7280;">We hope you had a wonderful time at <strong>${listing.title}</strong>. Your feedback helps future guests and helps us keep our properties at their best.</p>
    <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;color:#374151;font-size:14px;"><strong>${listing.title}</strong></p>
      <p style="margin:0;color:#6b7280;font-size:13px;">${fmtDate(booking.check_in)} – ${fmtDate(booking.check_out)}</p>
    </div>
    <a href="${siteUrl}/review?token=${reviewToken}" style="display:inline-block;background:#c9a96e;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Leave a Review →</a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">This link is personal to your booking and expires after use. It takes less than 60 seconds.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: booking.guest_email,
    subject: `How was your stay at ${listing.title}?`,
    html,
  });
}

export async function sendCleanerJobAssigned(
  cleanerEmail: string,
  cleanerName: string,
  job: { id: string; scheduled_date: string; scheduled_time: string; cleaner_payout: number },
  listing: { title: string; address?: string | null; city?: string | null; latitude?: number | null; longitude?: number | null; checkin_instructions?: string | null }
) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';

  const address = [listing.address, listing.city].filter(Boolean).join(', ');
  const mapsQuery = (listing.latitude && listing.longitude)
    ? `${listing.latitude},${listing.longitude}`
    : encodeURIComponent(address);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const accessBlock = listing.checkin_instructions
    ? `<div style="background:#f0fdf4;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#166534;">Property Access Instructions</p>
        <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${listing.checkin_instructions}</p>
      </div>`
    : `<p style="margin:0 0 24px;color:#6b7280;font-size:14px;">No specific access instructions were provided. Please contact the owner if you need entry details.</p>`;

  const html = baseEmailHtml(
    'New Cleaning Job Assigned',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">New job assigned, ${cleanerName.split(' ')[0]}! 🧹</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Your bid has been accepted for <strong>${listing.title}</strong>. Here are the details you need to get started.</p>

    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Property</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${listing.title}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Address</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${address || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Date</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${job.scheduled_date}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Time</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${job.scheduled_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Your payout</strong></td><td style="padding:6px 0;color:#059669;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">€${job.cleaner_payout}</td></tr>
    </table>

    <div style="margin-bottom:24px;">
      <a href="${mapsUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">📍 Get Directions on Google Maps →</a>
    </div>

    ${accessBlock}

    <a href="${siteUrl}/cleaner/jobs/${job.id}" style="display:inline-block;background:#c9a96e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Job Details →</a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Questions? Reply to this email or contact the platform admin.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: cleanerEmail,
    subject: `New cleaning job – ${listing.title} on ${job.scheduled_date}`,
    html,
  });
}

export async function sendCleaningPaymentReceipt(params: {
  ownerEmail: string;
  ownerName: string;
  jobId: string;
  listingTitle: string;
  scheduledDate: string;
  agreedPrice: number;
}) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  const html = baseEmailHtml(
    'Cleaning Payment Receipt',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Payment Confirmed ✓</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${params.ownerName.split(' ')[0]}, your payment for the cleaning job has been received and the cleaner's payout is on its way.</p>

    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Property</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${params.listingTitle}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Cleaning Date</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${params.scheduledDate}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Amount Paid</strong></td><td style="padding:6px 0;color:#059669;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(params.agreedPrice)}</td></tr>
    </table>

    <a href="${siteUrl}/owner/cleaning/jobs/${params.jobId}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Job →</a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Please keep this email as your receipt.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: params.ownerEmail,
    subject: `Cleaning payment receipt – ${params.listingTitle}`,
    html,
  });
}

export async function sendCleaningPayoutNotification(params: {
  cleanerEmail: string;
  cleanerName: string;
  jobId: string;
  listingTitle: string;
  scheduledDate: string;
  cleanerPayout: number;
}) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  const html = baseEmailHtml(
    'Your Cleaning Payout',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Payout on its way! 💸</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${params.cleanerName.split(' ')[0]}, the owner has approved and paid for your cleaning job. Your payout has been initiated.</p>

    <table width="100%" style="background:#f0fdf4;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Property</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${params.listingTitle}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #bbf7d0;"><strong>Cleaning Date</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #bbf7d0;">${params.scheduledDate}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #bbf7d0;"><strong>Your Payout</strong></td><td style="padding:6px 0;color:#059669;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #bbf7d0;">${fmtCurrency(params.cleanerPayout)}</td></tr>
    </table>

    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Funds typically arrive within 2–5 business days depending on your bank.</p>
    <a href="${siteUrl}/cleaner/jobs/${params.jobId}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Job →</a>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: params.cleanerEmail,
    subject: `Your cleaning payout – ${fmtCurrency(params.cleanerPayout)}`,
    html,
  });
}

export async function sendTelegramDirectAccepted(params: {
  guestEmail: string;
  guestName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  ownerName: string | null;
  ownerPhone: string | null;
  bookingId: string;
}) {
  const resend = getResend();
  const firstName = params.guestName.split(' ')[0];
  const ref = params.bookingId.slice(0, 8).toUpperCase();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';

  const contactLines = [
    params.ownerPhone
      ? `<p style="margin:8px 0;font-size:15px;"><strong>📱 Phone / WhatsApp / Viber:</strong> <a href="tel:${params.ownerPhone}" style="color:#1a1a2e;">${params.ownerPhone}</a></p>`
      : '',
    params.ownerPhone
      ? `<p style="margin:4px 0;font-size:13px;color:#6b7280;">You can also reach them on WhatsApp or Viber at the same number.</p>`
      : '',
  ].join('');

  const html = baseEmailHtml(
    'Your booking is confirmed!',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Your booking is confirmed! 🎉</h2>
    <p style="margin:0 0 20px;color:#6b7280;">Hi ${firstName}, great news — the owner has accepted your booking request for <strong>${params.listingTitle}</strong>. Contact them directly to arrange payment.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#166534;">Booking details</p>
      <p style="margin:4px 0;font-size:14px;color:#374151;">📍 ${params.listingTitle}</p>
      <p style="margin:4px 0;font-size:14px;color:#374151;">📅 ${fmtDate(params.checkIn)} → ${fmtDate(params.checkOut)} &nbsp;·&nbsp; ${params.nights} nights</p>
      <p style="margin:4px 0;font-size:14px;font-weight:600;color:#374151;">💶 Total: €${params.totalPrice}</p>
      <p style="margin:4px 0;font-size:13px;color:#6b7280;">Ref: ${ref}</p>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#92400e;">Contact the owner to arrange payment</p>
      ${params.ownerName ? `<p style="margin:0 0 6px;font-size:14px;color:#374151;"><strong>Owner:</strong> ${params.ownerName}</p>` : ''}
      ${contactLines || '<p style="margin:0;font-size:14px;color:#6b7280;">The owner will contact you shortly with payment details.</p>'}
    </div>
    <a href="${siteUrl}/my-booking?ref=${ref}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View your booking →</a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Need help? Reply to this email or visit <a href="${siteUrl}/contact" style="color:#1a1a2e;">${siteUrl}/contact</a></p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: params.guestEmail,
    subject: `✅ Booking confirmed — ${params.listingTitle}`,
    html,
  });
}

export async function sendTelegramDirectDeclined(params: {
  guestEmail: string;
  guestName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}) {
  const resend = getResend();
  const firstName = params.guestName.split(' ')[0];
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';

  const html = baseEmailHtml(
    'Booking request not confirmed',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Booking not confirmed</h2>
    <p style="margin:0 0 16px;color:#6b7280;">Hi ${firstName}, unfortunately the owner was unable to confirm your booking request for <strong>${params.listingTitle}</strong> (${fmtDate(params.checkIn)} – ${fmtDate(params.checkOut)}).</p>
    <p style="margin:0 0 20px;color:#6b7280;">The dates have been released. You're welcome to browse other available properties.</p>
    <a href="${siteUrl}/rentals" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Browse properties →</a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Questions? Reply to this email or visit <a href="${siteUrl}/contact" style="color:#1a1a2e;">${siteUrl}/contact</a></p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: params.guestEmail,
    subject: `Booking request for ${params.listingTitle} — not confirmed`,
    html,
  });
}

export async function sendSubscriptionPaymentLink(params: {
  ownerEmail: string;
  ownerName: string | null;
  paymentUrl: string;
}) {
  const resend = getResend();
  const firstName = params.ownerName?.split(' ')[0] ?? 'there';
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';

  const html = baseEmailHtml(
    'Your KefaloniaBNB Subscription Payment Link',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Activate Your Direct Contact Subscription</h2>
    <p style="margin:0 0 16px;color:#6b7280;">Hi ${firstName}, here is your payment link to activate the <strong>Direct Contact Subscription</strong> (€299/year).</p>
    <div style="margin:0 0 24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
      <p style="margin:0 0 8px;font-weight:600;color:#166534;font-size:14px;">What you get:</p>
      <ul style="margin:0;padding-left:20px;color:#166534;font-size:13px;line-height:2;">
        <li>WhatsApp &amp; Viber direct contact badge on all your listings</li>
        <li>Reduced platform commission: 3% (down from 5%)</li>
        <li>Annual renewal at €299/year</li>
      </ul>
    </div>
    <a href="${params.paymentUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Pay €299 &amp; Activate →</a>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">This link expires in 24 hours. If you have questions, reply to this email or visit <a href="${siteUrl}/contact" style="color:#1a1a2e;">${siteUrl}/contact</a>.</p>
    <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Or copy this URL:<br><span style="word-break:break-all;">${params.paymentUrl}</span></p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: params.ownerEmail,
    subject: 'Your KefaloniaBNB subscription payment link',
    html,
  });
}

/**
 * Generic owner notification for booking lifecycle events.
 * Called whenever something happens that the owner should know about.
 */
export async function sendOwnerNotification(params: {
  ownerEmail: string;
  eventType: 'confirmed' | 'cancelled' | 'deposit_paid' | 'fully_paid' | 'td_accepted' | 'td_declined' | 'td_paid';
  booking: Booking;
  listing: Listing;
}) {
  const resend = getResend();
  const { ownerEmail, eventType, booking, listing } = params;
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  const ref = booking.id.slice(0, 8).toUpperCase();
  const depositAmt = (booking as any).deposit_amount ?? 0;
  const remaining = (booking as any).remaining_amount ?? (booking.total_price - depositAmt);

  const titles: Record<string, string> = {
    confirmed: 'Booking Confirmed',
    cancelled: 'Booking Cancelled',
    deposit_paid: 'Deposit Received',
    fully_paid: 'Full Payment Received',
    td_accepted: 'Telegram Booking Accepted',
    td_declined: 'Telegram Booking Declined',
    td_paid: 'Telegram Payment Received',
  };

  const descriptions: Record<string, string> = {
    confirmed: `The booking for <strong>${listing.title}</strong> has been confirmed.`,
    cancelled: `The booking for <strong>${listing.title}</strong> has been cancelled.${booking.cancel_reason ? ` Reason: ${booking.cancel_reason}` : ''}`,
    deposit_paid: `A deposit of <strong>€${depositAmt}</strong> has been received for <strong>${listing.title}</strong>. Remaining balance: <strong>€${remaining}</strong> (due on arrival).`,
    fully_paid: `Full payment of <strong>€${booking.total_price}</strong> has been received for <strong>${listing.title}</strong>.`,
    td_accepted: `You accepted the Telegram Direct booking for <strong>${listing.title}</strong>.`,
    td_declined: `You declined the Telegram Direct booking for <strong>${listing.title}</strong>.`,
    td_paid: `Payment has been marked as received for the Telegram Direct booking at <strong>${listing.title}</strong>.`,
  };

  const statusColors: Record<string, string> = {
    confirmed: '#059669', cancelled: '#dc2626', deposit_paid: '#2563eb',
    fully_paid: '#059669', td_accepted: '#059669', td_declined: '#dc2626', td_paid: '#059669',
  };

  const html = baseEmailHtml(
    titles[eventType] ?? 'Booking Update',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">${titles[eventType]}</h2>
    <p style="margin:0 0 24px;color:#6b7280;">${descriptions[eventType]}</p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Guest</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${booking.guest_name}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Email</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${booking.guest_email}</td></tr>
      ${booking.guest_phone ? `<tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Phone</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${booking.guest_phone}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Dates</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)} (${booking.nights}n)</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Status</strong></td><td style="padding:6px 0;font-size:14px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;color:${statusColors[eventType] ?? '#374151'};">${titles[eventType]}</td></tr>
    </table>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Ref: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${ref}</code></p>
    <a href="${siteUrl}/admin/bookings/${booking.id}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Booking →</a>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: ownerEmail,
    subject: `[${titles[eventType]}] ${booking.guest_name} · ${listing.title} · Ref: ${ref}`,
    html,
  });
}

export async function sendBookingCancelled(booking: Booking, listing: Listing) {
  const resend = getResend();
  const html = baseEmailHtml(
    'Booking Cancelled',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Booking Cancelled</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hi ${booking.guest_name.split(' ')[0]}, your booking for ${listing.title} (${fmtDate(booking.check_in)} – ${fmtDate(booking.check_out)}) has been cancelled.</p>
    ${booking.cancel_reason ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;"><strong>Reason:</strong> ${booking.cancel_reason}</p>` : ''}
    <p style="margin:0;color:#6b7280;font-size:14px;">If you believe this is an error or have questions, please reply to this email.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: booking.guest_email,
    subject: `Booking cancelled – ${listing.title}`,
    html,
  });
}

export async function sendPaymentDetails(params: {
  guestEmail: string;
  guestName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  payMethod: string;
  paymentDetails: string;
  bookingId: string;
}) {
  const resend = getResend();
  const firstName = params.guestName.split(' ')[0];
  const ref = params.bookingId.slice(0, 8).toUpperCase();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';

  const detailsHtml = params.paymentDetails
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const html = baseEmailHtml(
    'Payment Instructions for Your Booking',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Payment Instructions 💳</h2>
    <p style="margin:0 0 20px;color:#6b7280;">Hi ${firstName}, the owner has sent you payment instructions for <strong>${params.listingTitle}</strong>.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#166534;">Booking summary</p>
      <p style="margin:4px 0;font-size:14px;color:#374151;">📍 ${params.listingTitle}</p>
      <p style="margin:4px 0;font-size:14px;color:#374151;">📅 ${fmtDate(params.checkIn)} → ${fmtDate(params.checkOut)}</p>
      <p style="margin:4px 0;font-size:14px;font-weight:600;color:#374151;">💶 Total: €${params.totalPrice}</p>
      <p style="margin:4px 0;font-size:13px;color:#6b7280;">Ref: ${ref}</p>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#92400e;">Payment via ${params.payMethod}</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${detailsHtml}</p>
    </div>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Once payment is sent, the owner will mark your booking as paid and you will receive a confirmation.</p>
    <a href="${siteUrl}/my-booking?ref=${ref}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View your booking →</a>
    <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Questions? Reply to this email.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: params.guestEmail,
    subject: `💳 Payment instructions — ${params.listingTitle} (Ref: ${ref})`,
    html,
  });
}

// ─── Restaurant Reservation Emails ────────────────────────────────────────

export async function sendReservationReceived(reservation: any, restaurant: any) {
  if (!reservation.guest_email) return;
  const resend = getResend();
  const ref = reservation.id.slice(0, 8).toUpperCase();

  const html = baseEmailHtml(
    'Reservation Received',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Thank you, ${reservation.guest_name.split(' ')[0]}!</h2>
    <p style="margin:0 0 24px;color:#6b7280;">We've received your reservation request at <strong>${restaurant.name}</strong>. The restaurant will confirm it shortly.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Restaurant</td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${restaurant.name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Date</td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${reservation.date}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Time</td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${reservation.time_slot}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Guests</td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${reservation.guest_count}</td></tr>
    </table>
    ${reservation.special_requests ? `<p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Special requests: <em>"${reservation.special_requests}"</em></p>` : ''}
    <p style="margin:0;color:#9ca3af;font-size:12px;">Reference: ${ref}</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: reservation.guest_email,
    subject: `🍽️ Reservation received — ${restaurant.name} (Ref: ${ref})`,
    html,
  });
}

export async function sendReservationConfirmed(reservation: any, restaurant: any) {
  if (!reservation.guest_email) return;
  const resend = getResend();
  const ref = reservation.id.slice(0, 8).toUpperCase();

  const html = baseEmailHtml(
    'Reservation Confirmed',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Your reservation is confirmed! ✅</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Great news, ${reservation.guest_name.split(' ')[0]}! Your table at <strong>${restaurant.name}</strong> has been confirmed.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Restaurant</td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${restaurant.name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Date</td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${reservation.date}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Time</td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${reservation.time_slot}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Guests</td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;font-weight:600;">${reservation.guest_count}</td></tr>
    </table>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">If you need to cancel, please contact the restaurant directly.</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">Reference: ${ref}</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: reservation.guest_email,
    subject: `✅ Reservation confirmed — ${restaurant.name} (Ref: ${ref})`,
    html,
  });
}

export async function sendRestaurantOwnerInvite(email: string, fullName: string, inviteLink: string) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;

  const html = baseEmailHtml(
    "You've been invited to KefaloniaBNB",
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Welcome, ${fullName.split(' ')[0]}!</h2>
    <p style="margin:0 0 24px;color:#6b7280;">You've been invited as a <strong>restaurant owner</strong> on <strong>KefaloniaBNB</strong>. From your dashboard you'll be able to manage tables, view and confirm reservations, and more.</p>
    <p style="margin:0 0 24px;color:#6b7280;">Click the button below to set your password and activate your account.</p>
    <a href="${inviteLink}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Set your password →</a>
    <div style="margin-top:24px;background:#f9fafb;border-radius:8px;padding:16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">By activating your account you agree to the KefaloniaBNB platform policies:</p>
      <ul style="margin:0;padding-left:20px;color:#6b7280;font-size:13px;line-height:2;">
        <li><a href="${siteUrl}/terms" style="color:#1a1a2e;text-decoration:underline;">Terms &amp; Conditions</a></li>
        <li><a href="${siteUrl}/privacy-policy" style="color:#1a1a2e;text-decoration:underline;">Privacy Policy</a></li>
      </ul>
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">This link expires in 24 hours. If you weren't expecting this invitation, you can safely ignore this email.</p>
    <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Or copy this URL into your browser:<br><span style="word-break:break-all;">${inviteLink}</span></p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: email,
    subject: "You've been invited to KefaloniaBNB — Restaurant Owner",
    html,
  });
}

export async function sendReservationCancelled(reservation: any, restaurant: any) {
  if (!reservation.guest_email) return;
  const resend = getResend();
  const ref = reservation.id.slice(0, 8).toUpperCase();

  const html = baseEmailHtml(
    'Reservation Cancelled',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Reservation cancelled</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Unfortunately, your reservation at <strong>${restaurant.name}</strong> for <strong>${reservation.date}</strong> at <strong>${reservation.time_slot}</strong> has been cancelled.</p>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Please feel free to make a new reservation or contact the restaurant directly.</p>
    <p style="margin:0;color:#9ca3af;font-size:12px;">Reference: ${ref}</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: reservation.guest_email,
    subject: `❌ Reservation cancelled — ${restaurant.name} (Ref: ${ref})`,
    html,
  });
}

export async function sendVerificationEmail(
  booking: Booking,
  listing: Pick<Listing, 'title' | 'check_in_time' | 'check_out_time'>,
  verificationToken: string,
) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const ref = booking.id.slice(0, 8).toUpperCase();
  const verifyUrl = `${siteUrl}/api/auth/verify-booking-email?token=${verificationToken}`;

  const html = baseEmailHtml(
    'Verify your email',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Verify your email</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Please verify your email address to confirm your booking for <strong>${listing.title}</strong>.</p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Check-in</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${fmtDate(booking.check_in)} from ${listing.check_in_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Check-out</strong></td><td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${fmtDate(booking.check_out)} by ${listing.check_out_time}</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;border-top:1px solid #e5e7eb;"><strong>Total</strong></td><td style="padding:6px 0;color:#111;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${fmtCurrency(booking.total_price, booking.currency)}</td></tr>
    </table>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${verifyUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">Verify Email & Confirm Booking</a>
    </div>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Booking reference: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${ref}</code></p>
    <p style="margin:0;color:#ef4444;font-size:13px;font-weight:500;">This link expires in 24 hours. Unverified bookings are automatically cancelled.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: booking.guest_email,
    subject: `Verify your email — ${listing.title} (Ref: ${ref})`,
    html,
  });
}

export async function sendGuestMagicLink(email: string, token: string) {
  const resend = getResend();
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const loginUrl = `${siteUrl}/api/auth/guest-magic-login?token=${token}`;

  const html = baseEmailHtml(
    'Your login link',
    `<h2 style="margin:0 0 8px;font-size:24px;color:#111;">Your login link</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Click the button below to view your bookings on KefaloniaBNB.</p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${loginUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">View My Bookings</a>
    </div>
    <p style="margin:0;color:#9ca3af;font-size:13px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`
  );

  await resend.emails.send({
    from: import.meta.env.EMAIL_FROM,
    to: email,
    subject: 'Your login link — KefaloniaBNB',
    html,
  });
}

