import type { APIRoute } from 'astro';
import { createConnectAccount, createAccountLink, getConnectAccount } from '../../../../lib/stripe.ts';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const POST: APIRoute = async ({ locals, request }) => {
  const session = locals.session;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const siteUrl = (await request.json().catch(() => ({}))).siteUrl
    ?? import.meta.env.PUBLIC_SITE_URL
    ?? 'http://localhost:4321';

  const service = getServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('stripe_account_id, email')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    let stripeAccountId = profile.stripe_account_id;

    // Create account if they don't have one yet
    if (!stripeAccountId) {
      const account = await createConnectAccount(session.user.email ?? profile.email);
      stripeAccountId = account.id;

      await service
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId, stripe_account_status: 'pending' })
        .eq('id', session.user.id);
    } else {
      // Verify existing account is still valid before generating link
      await getConnectAccount(stripeAccountId);
    }

    const link = await createAccountLink(stripeAccountId, siteUrl);
    return new Response(JSON.stringify({ url: link.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Stripe Connect onboard error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Failed to create account link' }), { status: 500 });
  }
};
