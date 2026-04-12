import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase';
import { requireAdmin } from '../../../../../lib/cleaning/permissions.ts';
import { getStripe } from '../../../../../lib/stripe.ts';

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

  if (!booking)                        return err('Booking not found', 404);
  if (booking.status !== 'confirmed')  return err('Only confirmed bookings can be charged');
  if ((booking as any).commission_invoice_status === 'paid') return err('Commission already paid');

  const listing = (booking as any).listings;

  const { data: ownerProfile } = listing?.owner_id
    ? await service.from('profiles').select('id, email, full_name').eq('id', listing.owner_id).single()
    : { data: null };

  if (!ownerProfile?.email) return err('Owner has no email — add it in the admin owner profile');

  // Use stored platform_fee if available
  const commissionAmt = (booking as any).platform_fee > 0
    ? parseFloat(((booking as any).platform_fee).toFixed(2))
    : parseFloat((booking.total_price * (listing?.commission_rate ?? 10) / 100).toFixed(2));

  if (commissionAmt <= 0) return err('Commission amount is zero');

  const stripe     = getStripe();
  const ref        = id.slice(0, 8).toUpperCase();
  const amountCents = Math.round(commissionAmt * 100);
  const currency   = (booking.currency ?? 'eur').toLowerCase();

  // Create a one-time price
  const price = await stripe.prices.create({
    currency,
    unit_amount: amountCents,
    product_data: {
      name: `Platform commission — ${listing?.title ?? 'Booking'} · ${booking.check_in} → ${booking.check_out}`,
      metadata: { booking_id: id, booking_ref: ref },
    },
  });

  // Create payment link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata:   { type: 'commission', booking_id: id, booking_ref: ref, owner_email: ownerProfile.email },
    after_completion: {
      type:    'hosted_confirmation',
      hosted_confirmation: { custom_message: `Thank you! Your platform commission for booking ${ref} has been received.` },
    },
  });

  // Store on booking
  await service.from('bookings').update({
    commission_invoice_url:     paymentLink.url,
    commission_invoice_status:  'sent',
    commission_invoice_sent_at: new Date().toISOString(),
  }).eq('id', id);

  await service.from('audit_logs').insert({
    actor_id: locals.session!.user.id,
    action: 'booking.commission_payment_link_created',
    entity_type: 'bookings',
    entity_id: id,
    payload: { amount: commissionAmt, url: paymentLink.url },
  });

  return new Response(JSON.stringify({
    ok:       true,
    url:      paymentLink.url,
    amount:   commissionAmt,
    sentTo:   ownerProfile.email,
  }), { status: 200, headers: J });
};
