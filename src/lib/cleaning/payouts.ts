import Stripe from 'stripe';
import { getServiceClient } from '../supabase.ts';
import { computeFees } from '../types/cleaning.ts';

function getStripe() {
  return new Stripe(import.meta.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

/**
 * Create a Stripe Checkout Session for the owner to pay for a cleaning job.
 */
export async function createCleaningCheckout(params: {
  jobId: string;
  agreedPrice: number;
  listingTitle: string;
  scheduledDate: string;
  ownerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.ownerEmail,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(params.agreedPrice * 100),
          product_data: {
            name: `Cleaning — ${params.listingTitle}`,
            description: `Scheduled: ${params.scheduledDate}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { job_id: params.jobId, type: 'cleaning' },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session;
}

/**
 * Transfer the cleaner's payout via Stripe Connect after job approval.
 */
export async function sendCleanerPayout(jobId: string) {
  const service = getServiceClient();
  const stripe = getStripe();

  // Get job + payment + cleaner stripe account
  const { data: job } = await service
    .from('cleaning_jobs')
    .select('*, cleaner_profiles(stripe_account_id, stripe_onboarded)')
    .eq('id', jobId)
    .single();

  if (!job) throw new Error('Job not found');

  const cleanerProfile = (job as any).cleaner_profiles;
  if (!cleanerProfile?.stripe_onboarded || !cleanerProfile?.stripe_account_id) {
    throw new Error('Cleaner Stripe account not ready');
  }

  const { data: payment } = await service
    .from('cleaning_payments')
    .select('*')
    .eq('job_id', jobId)
    .eq('status', 'paid')
    .single();

  if (!payment) throw new Error('Payment not found or not paid');

  const { platformFee, cleanerPayout } = computeFees(job.agreed_price);

  const transfer = await stripe.transfers.create({
    amount: Math.round(cleanerPayout * 100),
    currency: 'eur',
    destination: cleanerProfile.stripe_account_id,
    transfer_group: jobId,
    metadata: { job_id: jobId },
  });

  // Record payout
  await service.from('cleaning_payouts').insert({
    job_id: jobId,
    cleaner_id: job.cleaner_id,
    stripe_transfer_id: transfer.id,
    amount: cleanerPayout,
    currency: 'eur',
    status: 'transferred',
    transferred_at: new Date().toISOString(),
  });

  return transfer;
}
