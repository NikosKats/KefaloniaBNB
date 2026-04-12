import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getServiceClient } from '../../../lib/supabase.ts';
import { requireSession } from '../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ locals, request }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const service = getServiceClient();

  const { data: cleaner } = await service
    .from('cleaner_profiles')
    .select('id, stripe_account_id, stripe_onboarded')
    .eq('user_id', userId)
    .single();

  if (!cleaner) {
    return new Response(JSON.stringify({ error: 'Cleaner profile not found' }), { status: 404 });
  }

  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  let accountId = cleaner.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GR',
      metadata: { cleaner_id: cleaner.id, user_id: userId },
    });
    accountId = account.id;
    await service
      .from('cleaner_profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', cleaner.id);
  }

  const body = await request.json().catch(() => ({}));
  const origin = 'https://kefaloniabnb.com';
  const returnUrl = body.return_url ?? `${origin}/cleaner/dashboard?stripe=return`;
  const refreshUrl = body.refresh_url ?? `${origin}/cleaner/connect`;

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  return new Response(JSON.stringify({ url: link.url }), { status: 200 });
};
