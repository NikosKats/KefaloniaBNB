import type { APIRoute } from 'astro';
import { disconnectConnectAccount } from '../../../../lib/stripe.ts';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const POST: APIRoute = async ({ locals }) => {
  const session = locals.session;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const service = getServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const stripeAccountId = profile.stripe_account_id;
  if (!stripeAccountId) {
    return new Response(JSON.stringify({ error: 'No Stripe account linked' }), { status: 400 });
  }

  try {
    await disconnectConnectAccount(stripeAccountId);

    const service = getServiceClient();
    await service
      .from('profiles')
      .update({
        stripe_account_id: null,
        stripe_account_status: 'not_connected',
        stripe_onboarding_done: false,
      })
      .eq('id', session.user.id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Stripe Connect disconnect error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
