import type { APIRoute } from 'astro';
import { getConnectAccount } from '../../../../lib/stripe.ts';
import { getServiceClient } from '../../../../lib/supabase.ts';

/**
 * Called by Astro server after Stripe redirects to /admin/profile?stripe=success.
 * This endpoint is hit programmatically from the profile page to refresh account status.
 */
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
    const account = await getConnectAccount(stripeAccountId);

    const onboardingDone =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    let status: string;
    if (onboardingDone) {
      status = 'active';
    } else if (account.requirements?.disabled_reason) {
      status = 'restricted';
    } else {
      status = 'pending';
    }

    const service = getServiceClient();
    await service
      .from('profiles')
      .update({
        stripe_account_status: status,
        stripe_onboarding_done: onboardingDone ?? false,
      })
      .eq('id', session.user.id);

    return new Response(
      JSON.stringify({ status, onboarding_done: onboardingDone }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Stripe Connect callback error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
