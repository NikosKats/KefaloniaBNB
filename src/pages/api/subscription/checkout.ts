import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { createSubscriptionCheckout } from '../../../lib/stripe.ts';
import { sendSubscriptionPaymentLink } from '../../../lib/email.ts';

/**
 * POST /api/subscription/checkout
 *
 * Body: { profile_id: string }  — the owner whose subscription to activate.
 * Only callable by super_admin (or the owner themselves if self-serve).
 *
 * Returns: { url: string } — redirect the caller to this Stripe Checkout URL.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // locals.profile is only set for /admin/* routes; fetch it here for /api/subscription/*
  let callerRole = locals.profile?.role;
  if (!callerRole) {
    const service = getServiceClient();
    const { data: p } = await service.from('profiles').select('role').eq('id', locals.session.user.id).single();
    callerRole = p?.role;
  }

  if (!callerRole || !['admin', 'super_admin', 'property_owner'].includes(callerRole)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: { profile_id?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  // Super admin can generate a link for any owner; an owner can only generate for themselves.
  const targetProfileId =
    callerRole === 'super_admin' || callerRole === 'admin'
      ? (body.profile_id ?? locals.session!.user.id)
      : locals.session!.user.id;

  const service = getServiceClient();
  const { data: owner, error } = await service
    .from('profiles')
    .select('id, email, full_name, subscription_stripe_customer_id')
    .eq('id', targetProfileId)
    .single();

  if (error || !owner) {
    return new Response(JSON.stringify({ error: 'Owner not found' }), { status: 404 });
  }

  const siteUrl = import.meta.env.PUBLIC_SITE_URL as string;

  try {
    const session = await createSubscriptionCheckout({
      ownerProfileId:    owner.id,
      ownerEmail:        owner.email,
      ownerName:         owner.full_name,
      successUrl:        `${siteUrl}/admin/profile?subscription=success`,
      cancelUrl:         `${siteUrl}/admin/profile?subscription=cancelled`,
      existingCustomerId: owner.subscription_stripe_customer_id,
    });

    // Persist customer ID if newly created (it's embedded in the session's customer field)
    if (!owner.subscription_stripe_customer_id && session.customer) {
      await service
        .from('profiles')
        .update({ subscription_stripe_customer_id: session.customer as string })
        .eq('id', owner.id);
    }

    // Send payment link to owner via email
    sendSubscriptionPaymentLink({
      ownerEmail: owner.email,
      ownerName: owner.full_name,
      paymentUrl: session.url!,
    }).catch((e) => console.error('Failed to send subscription email:', e));

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('Subscription checkout error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 502 });
  }
};
