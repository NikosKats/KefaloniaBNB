import Stripe from 'stripe';
import type { Booking, Listing } from '../types/index.ts';
import { getEnv } from './env.ts';

export function getStripe() {
  const env = getEnv();
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
}

export interface CheckoutSessionParams {
  booking: Booking;
  listing: Listing;
  successUrl: string;
  cancelUrl: string;
  /** When set, charge this amount instead of the full price (used for deposit payments) */
  chargeAmount?: number;
  paymentType?: 'full' | 'deposit';
}

export async function createCheckoutSession({
  booking,
  listing,
  successUrl,
  cancelUrl,
  chargeAmount,
  paymentType = 'full',
}: CheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const currency = booking.currency.toLowerCase();
  const isDeposit = paymentType === 'deposit' && chargeAmount != null;

  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

  if (isDeposit) {
    // Single line item for the deposit amount
    const remaining = booking.total_price - chargeAmount!;
    lineItems = [
      {
        price_data: {
          currency,
          product_data: {
            name: `Deposit – ${listing.title}`,
            description: `${booking.check_in} → ${booking.check_out} · ${booking.nights} nights · Remaining €${remaining.toFixed(0)} due on arrival`,
          },
          unit_amount: Math.round(chargeAmount! * 100),
        },
        quantity: 1,
      },
    ];
  } else {
    lineItems = [
      {
        price_data: {
          currency,
          product_data: {
            name: `${listing.title}`,
            description: `${booking.check_in} → ${booking.check_out} · ${booking.nights} nights · ${booking.guests_adults + booking.guests_children} guests`,
            images: [],
          },
          unit_amount: Math.round(booking.base_total * 100),
        },
        quantity: 1,
      },
    ];

    if (booking.cleaning_fee > 0) {
      lineItems.push({
        price_data: { currency, product_data: { name: 'Cleaning fee' }, unit_amount: Math.round(booking.cleaning_fee * 100) },
        quantity: 1,
      });
    }
    if (booking.extra_guest_fee > 0) {
      lineItems.push({
        price_data: { currency, product_data: { name: 'Extra guest fee' }, unit_amount: Math.round(booking.extra_guest_fee * 100) },
        quantity: 1,
      });
    }
    if (booking.coupon_discount > 0) {
      lineItems.push({
        price_data: { currency, product_data: { name: 'Discount' }, unit_amount: -Math.round(booking.coupon_discount * 100) },
        quantity: 1,
      });
    }
  }

  const idempotencyKey = `checkout_${booking.id}_${paymentType}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: booking.guest_email,
    metadata: {
      booking_id: booking.id,
      listing_id: booking.listing_id,
      payment_type: paymentType,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    payment_intent_data: {
      metadata: { booking_id: booking.id },
      description: isDeposit
        ? `Deposit: ${listing.title} · ${booking.check_in} → ${booking.check_out}`
        : `Booking: ${listing.title} · ${booking.check_in} → ${booking.check_out}`,
    },
  }, { idempotencyKey });

  return session;
}

export async function constructWebhookEvent(
  payload: string,
  sig: string
): Promise<Stripe.Event> {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(
    payload,
    sig,
    getEnv().STRIPE_WEBHOOK_SECRET
  );
}

// ── Owner Subscription ────────────────────────────────────────────────────────

export const SUBSCRIPTION_PRICE_EUR = 299;
export const SUBSCRIPTION_COMMISSION_RATE = 3;   // % for subscribed owners
export const DEFAULT_COMMISSION_RATE       = 5;   // % for non-subscribed owners

export interface SubscriptionCheckoutParams {
  ownerProfileId:  string;
  ownerEmail:      string;
  ownerName:       string | null;
  successUrl:      string;
  cancelUrl:       string;
  existingCustomerId?: string | null;
}

/**
 * Creates a Stripe Checkout Session for the €299/year recurring subscription.
 * The price is looked up by the STRIPE_SUBSCRIPTION_PRICE_ID env var
 * (a recurring annual price created once in the Stripe dashboard).
 */
export async function createSubscriptionCheckout({
  ownerProfileId,
  ownerEmail,
  ownerName,
  successUrl,
  cancelUrl,
  existingCustomerId,
}: SubscriptionCheckoutParams): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = getEnv().STRIPE_SUBSCRIPTION_PRICE_ID;
  if (!priceId) throw new Error('STRIPE_SUBSCRIPTION_PRICE_ID environment variable is not set');

  // Create or reuse Stripe customer
  let customerId = existingCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ownerEmail,
      name:  ownerName ?? undefined,
      metadata: { profile_id: ownerProfileId },
    });
    customerId = customer.id;
  }

  const idempotencyKey = `sub_${ownerProfileId}_${Date.now()}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type:       'owner_subscription',
      profile_id: ownerProfileId,
    },
    subscription_data: {
      metadata: {
        profile_id: ownerProfileId,
      },
    },
    success_url: successUrl,
    cancel_url:  cancelUrl,
  }, { idempotencyKey });

  return session;
}

// ── Stripe Connect ────────────────────────────────────────────────────────────

/** Create a new Express connected account for a property owner */
export async function createConnectAccount(email: string): Promise<Stripe.Account> {
  const stripe = getStripe();
  return stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: { schedule: { interval: 'weekly', weekly_anchor: 'monday' } },
    },
  });
}

/** Generate an onboarding link for a connected account */
export async function createAccountLink(
  accountId: string,
  siteUrl: string
): Promise<Stripe.AccountLink> {
  const stripe = getStripe();
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl}/admin/profile?stripe=refresh`,
    return_url:  `${siteUrl}/admin/profile?stripe=success`,
    type: 'account_onboarding',
  });
}

/** Check current state of a connected account */
export async function getConnectAccount(accountId: string): Promise<Stripe.Account> {
  return getStripe().accounts.retrieve(accountId);
}

/** Delete / disconnect a connected account */
export async function disconnectConnectAccount(accountId: string): Promise<void> {
  await getStripe().accounts.del(accountId);
}

/**
 * Transfer the owner's share of a booking to their connected Stripe account.
 * Must be called after the charge has settled on the platform account.
 */
export async function transferOwnerPayout(params: {
  ownerStripeAccountId: string;
  amountCents: number;
  currency: string;
  bookingId: string;
}): Promise<Stripe.Transfer> {
  const idempotencyKey = `transfer_${params.bookingId}`;

  return getStripe().transfers.create({
    amount: params.amountCents,
    currency: params.currency.toLowerCase(),
    destination: params.ownerStripeAccountId,
    transfer_group: `booking_${params.bookingId}`,
    metadata: { booking_id: params.bookingId },
  }, { idempotencyKey });
}

// ── Commission Invoicing (Option C) ───────────────────────────────────────────

/**
 * Creates or retrieves a Stripe Customer for a property owner.
 * Stores the customer ID back to the profiles table via the passed updateFn.
 */
export async function createOrGetStripeCustomer(
  email: string,
  name: string | null,
  profileId: string,
  existingCustomerId: string | null,
): Promise<string> {
  const stripe = getStripe();
  if (existingCustomerId) {
    // Always sync the latest email/name so invoices reach the right address
    await stripe.customers.update(existingCustomerId, {
      email,
      name: name ?? undefined,
    });
    return existingCustomerId;
  }
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { profile_id: profileId },
  });
  return customer.id;
}

/**
 * Creates a Stripe invoice for the platform commission owed by an owner,
 * finalizes it and sends it — owner receives an email with a payment link.
 */
export async function createCommissionInvoice(params: {
  stripeCustomerId: string;
  amountCents:      number;
  currency:         string;
  description:      string;
  bookingId:        string;
  daysUntilDue?:    number;
  existingInvoiceId?: string | null;
}): Promise<{ invoiceId: string; invoiceUrl: string }> {
  const stripe = getStripe();

  // If an invoice already exists for this booking, just resend it
  if (params.existingInvoiceId) {
    try {
      const existing = await stripe.invoices.retrieve(params.existingInvoiceId);
      // If already finalized/sent, resend directly
      if (existing.status === 'open') {
        await stripe.invoices.sendInvoice(existing.id);
        return {
          invoiceId:  existing.id,
          invoiceUrl: existing.hosted_invoice_url ?? '',
        };
      }
      // Draft — finalize then send
      if (existing.status === 'draft') {
        const finalized = await stripe.invoices.finalizeInvoice(existing.id);
        await stripe.invoices.sendInvoice(finalized.id);
        return {
          invoiceId:  finalized.id,
          invoiceUrl: finalized.hosted_invoice_url ?? '',
        };
      }
    } catch {
      // Fall through to create a new invoice if retrieval fails
    }
  }

  // Create a fresh invoice item + invoice (use timestamp in idempotency key to allow resends)
  const timestamp = Date.now();

  await stripe.invoiceItems.create({
    customer:    params.stripeCustomerId,
    amount:      params.amountCents,
    currency:    params.currency,
    description: params.description,
  });

  const invoice = await stripe.invoices.create({
    customer:           params.stripeCustomerId,
    collection_method:  'send_invoice',
    days_until_due:     params.daysUntilDue ?? 14,
    metadata:           { booking_id: params.bookingId },
  }, { idempotencyKey: `invoice_${params.bookingId}_${timestamp}` });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.sendInvoice(finalized.id);

  return {
    invoiceId:  finalized.id,
    invoiceUrl: finalized.hosted_invoice_url ?? '',
  };
}
