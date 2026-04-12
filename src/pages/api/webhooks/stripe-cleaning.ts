import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getServiceClient } from '../../../lib/supabase.ts';
import { notify } from '../../../lib/cleaning/notifications.ts';
import { sendCleanerPayout } from '../../../lib/cleaning/payouts.ts';

export const POST: APIRoute = async ({ request }) => {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = import.meta.env.STRIPE_CLEANING_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.job_id;
    const type = session.metadata?.type;

    if (type !== 'cleaning' || !jobId) {
      return new Response('Not a cleaning payment', { status: 200 });
    }

    const service = getServiceClient();

    // Update payment record
    await service
      .from('cleaning_payments')
      .update({
        stripe_payment_intent: session.payment_intent as string,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('job_id', jobId)
      .eq('stripe_checkout_session', session.id);

    // Get job and notify
    const { data: job } = await service
      .from('cleaning_jobs')
      .select('*, cleaner_profiles(user_id)')
      .eq('id', jobId)
      .single();

    if (job) {
      const cleanerUserId = (job as any).cleaner_profiles?.user_id;
      await notify(service, job.owner_id, 'payment_received', { job_id: jobId });
      if (cleanerUserId) {
        await notify(service, cleanerUserId, 'payment_received', { job_id: jobId });
      }

      // If owner paid at approval time (job was completed), auto-approve and send payout
      if (job.status === 'completed') {
        await service
          .from('cleaning_jobs')
          .update({ status: 'approved', approved_at: new Date().toISOString() })
          .eq('id', jobId);

        try {
          await sendCleanerPayout(jobId);
          if (cleanerUserId) {
            await notify(service, cleanerUserId, 'job_approved', { job_id: jobId });
            await notify(service, cleanerUserId, 'payout_sent', { job_id: jobId });
          }
        } catch (e) {
          console.error('Payout failed after approval payment:', e);
        }
      }
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    if (account.details_submitted) {
      const service = getServiceClient();
      await service
        .from('cleaner_profiles')
        .update({ stripe_onboarded: true })
        .eq('stripe_account_id', account.id);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
