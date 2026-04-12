import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase';
import { createOrGetStripeCustomer, createCommissionInvoice } from '../../../../../lib/stripe';
import { requireAdmin } from '../../../../../lib/cleaning/permissions.ts';

const J   = { 'Content-Type': 'application/json' };
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

export const POST: APIRoute = async ({ params, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const { id } = params;
  if (!id) return err('Booking ID required');

  const service = getServiceClient();

  const { data: booking } = await service
    .from('bookings')
    .select('*, listings(title, owner_id, commission_rate)')
    .eq('id', id)
    .single();

  if (!booking)              return err('Booking not found', 404);
  if (booking.status !== 'confirmed') return err('Only confirmed bookings can be invoiced');
  if ((booking as any).commission_invoice_status === 'paid') return err('Commission already paid');

  const listing = (booking as any).listings;

  // Fetch owner profile separately — nested Supabase joins via owner_id FK are unreliable
  const { data: ownerProfile } = listing?.owner_id
    ? await service.from('profiles').select('id, email, full_name, stripe_customer_id').eq('id', listing.owner_id).single()
    : { data: null };

  if (!ownerProfile?.email) return err('Owner has no email — add it in the admin owner profile');

  // Use stored platform_fee if available (already calculated at booking time), otherwise derive from commission_rate
  const commissionAmt = (booking as any).platform_fee > 0
    ? parseFloat(((booking as any).platform_fee).toFixed(2))
    : parseFloat((booking.total_price * (listing?.commission_rate ?? 10) / 100).toFixed(2));
  if (commissionAmt <= 0) return err('Commission amount is zero');

  // Create or retrieve Stripe Customer for this owner
  const stripeCustomerId = await createOrGetStripeCustomer(
    ownerProfile.email,
    ownerProfile.full_name ?? null,
    ownerProfile.id,
    ownerProfile.stripe_customer_id ?? null,
  );

  // Save customer ID to profile if it was just created
  if (!ownerProfile.stripe_customer_id) {
    await service.from('profiles').update({ stripe_customer_id: stripeCustomerId }).eq('id', ownerProfile.id);
  }

  const ref            = id.slice(0, 8).toUpperCase();
  const displayRate    = listing?.commission_rate ?? Math.round((commissionAmt / booking.total_price) * 100);
  const description    = `Platform commission (${displayRate}%) — ${listing.title} · ${booking.check_in} → ${booking.check_out} · Booking ${ref}`;

  const { invoiceId, invoiceUrl } = await createCommissionInvoice({
    stripeCustomerId,
    amountCents:       Math.round(commissionAmt * 100),
    currency:          (booking.currency ?? 'eur').toLowerCase(),
    description,
    bookingId:         id,
    existingInvoiceId: (booking as any).commission_invoice_id ?? null,
  });

  await service.from('bookings').update({
    commission_invoice_id:      invoiceId,
    commission_invoice_status:  'sent',
    commission_invoice_url:     invoiceUrl,
    commission_invoice_sent_at: new Date().toISOString(),
  }).eq('id', id);

  return new Response(JSON.stringify({ ok: true, invoiceId, invoiceUrl, amount: commissionAmt, sentTo: ownerProfile.email }), {
    status: 200, headers: J,
  });
};
