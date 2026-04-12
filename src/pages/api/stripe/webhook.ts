import type { APIRoute } from 'astro';
import { constructWebhookEvent, transferOwnerPayout, SUBSCRIPTION_COMMISSION_RATE, DEFAULT_COMMISSION_RATE } from '../../../lib/stripe.ts';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendBookingConfirmed, sendDepositReceived, sendCleaningPaymentReceipt, sendCleaningPayoutNotification, sendOwnerNotification } from '../../../lib/email.ts';
import { sendCleanerPayout } from '../../../lib/cleaning/payouts.ts';
import { notify } from '../../../lib/cleaning/notifications.ts';
import { sendSimpleAlert } from '../../../lib/telegram.ts';
import { emitAdminEvent } from '../../../lib/admin-events.ts';
import { pushToAdminsAndOwner } from '../../../lib/push.ts';

// ── Subscription helpers ──────────────────────────────────────────────────────

/** Activate subscription on a profile and set all their listings to 3% commission */
async function activateSubscription(service: ReturnType<typeof getServiceClient>, profileId: string, subscriptionId: string, expiresAt: Date) {
  await service.from('profiles').update({
    subscription_active:                  true,
    subscription_expires_at:              expiresAt.toISOString(),
    subscription_stripe_subscription_id:  subscriptionId,
  }).eq('id', profileId);

  // Lower commission to 3% on all their listings
  await service.from('listings')
    .update({ commission_rate: SUBSCRIPTION_COMMISSION_RATE })
    .eq('owner_id', profileId);
}

/** Deactivate subscription on a profile and revert all their listings to 5% commission */
async function deactivateSubscription(service: ReturnType<typeof getServiceClient>, profileId: string) {
  await service.from('profiles').update({
    subscription_active:    false,
    subscription_expires_at: null,
  }).eq('id', profileId);

  // Revert commission to 5% on all their listings
  await service.from('listings')
    .update({ commission_rate: DEFAULT_COMMISSION_RATE })
    .eq('owner_id', profileId);
}

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';

  let event;
  try {
    event = await constructWebhookEvent(payload, sig);
  } catch (err: any) {
    console.error('Stripe webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const service = getServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;

      // ── Owner subscription checkout ─────────────────────────────────────────
      if (session.metadata?.type === 'owner_subscription') {
        const profileId = session.metadata?.profile_id;
        if (profileId && session.customer) {
          await service.from('profiles')
            .update({ subscription_stripe_customer_id: session.customer as string })
            .eq('id', profileId);
        }
        break;
      }

      // ── Cleaning payment ────────────────────────────────────────────────────
      if (session.metadata?.type === 'cleaning') {
        const jobId = session.metadata?.job_id;
        if (!jobId) break;

        // Mark payment as paid
        await service
          .from('cleaning_payments')
          .update({
            stripe_payment_intent: session.payment_intent as string,
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('stripe_checkout_session', session.id);

        // Fetch job + cleaner + owner info
        const { data: job } = await service
          .from('cleaning_jobs')
          .select('*, listings(title,city), cleaner_profiles(user_id, stripe_account_id, stripe_onboarded), profiles:owner_id(full_name, email)')
          .eq('id', jobId)
          .single();

        if (job) {
          const cleanerUserId = (job as any).cleaner_profiles?.user_id;
          const ownerProfile = (job as any).profiles;
          const listing = (job as any).listings;

          // Notify owner + cleaner of payment
          await notify(service, job.owner_id, 'payment_received', { job_id: jobId });
          if (cleanerUserId) {
            await notify(service, cleanerUserId, 'payment_received', { job_id: jobId });
          }

          // Auto-approve if job was completed
          if (job.status === 'completed') {
            await service
              .from('cleaning_jobs')
              .update({ status: 'approved', approved_at: new Date().toISOString() })
              .eq('id', jobId);

            if (cleanerUserId) {
              await notify(service, cleanerUserId, 'job_approved', { job_id: jobId });
            }

            // Trigger cleaner payout
            try {
              await sendCleanerPayout(jobId);
              if (cleanerUserId) {
                await notify(service, cleanerUserId, 'payout_sent', { job_id: jobId });
              }

              // Email: payout notification to cleaner
              const { data: cleanerUser } = await service
                .from('profiles')
                .select('full_name, email')
                .eq('id', cleanerUserId)
                .single();

              if (cleanerUser?.email) {
                sendCleaningPayoutNotification({
                  cleanerEmail: cleanerUser.email,
                  cleanerName: cleanerUser.full_name ?? 'Cleaner',
                  jobId,
                  listingTitle: listing?.title ?? 'Property',
                  scheduledDate: job.scheduled_date,
                  cleanerPayout: job.cleaner_payout,
                }).catch(console.error);
              }
            } catch (e) {
              console.error('Payout failed after cleaning approval payment:', e);
            }
          }

          // Email: receipt to owner
          if (ownerProfile?.email) {
            sendCleaningPaymentReceipt({
              ownerEmail: ownerProfile.email,
              ownerName: ownerProfile.full_name ?? 'Owner',
              jobId,
              listingTitle: listing?.title ?? 'Property',
              scheduledDate: job.scheduled_date,
              agreedPrice: job.agreed_price,
            }).catch(console.error);
          }
        }
        break;
      }

      // ── Commission payment link ─────────────────────────────────────────────
      if (session.metadata?.type === 'commission') {
        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          await service.from('bookings').update({
            commission_invoice_status: 'paid',
          }).eq('id', bookingId);
          await service.from('audit_logs').insert({
            action: 'booking.commission_paid',
            entity_type: 'bookings',
            entity_id: bookingId,
            payload: { amount: session.amount_total / 100, stripe_session: session.id },
          });
        }
        break;
      }

      // ── Booking payment ─────────────────────────────────────────────────────
      const bookingId = session.metadata?.booking_id;
      if (!bookingId) break;

      // Fetch listing + owner profile to calculate split
      const { data: listingData } = await service
        .from('listings')
        .select('id,title,owner_id,commission_rate,profiles(stripe_account_id,stripe_onboarding_done)')
        .eq('id', session.metadata?.listing_id)
        .single();

      const paidAmount = session.amount_total / 100;
      const sessionPaymentType = session.metadata?.payment_type ?? 'full';
      const isDeposit = sessionPaymentType === 'deposit';

      const commissionRate = (listingData as any)?.commission_rate ?? 10;
      const ownerProfile = (listingData as any)?.profiles;
      const hasOwner = !!(listingData as any)?.owner_id;

      // For deposits, defer payout until full payment received
      const platformFee    = isDeposit ? 0 : (hasOwner ? parseFloat((paidAmount * commissionRate / 100).toFixed(2)) : paidAmount);
      const ownerPayoutAmt = isDeposit ? 0 : (hasOwner ? parseFloat((paidAmount - platformFee).toFixed(2)) : 0);
      const payoutStatus   = isDeposit ? 'pending' : (hasOwner ? 'pending' : 'na');

      // Verify the booking still exists and is still pending before confirming
      // (another guest could have paid for the same dates if they started checkout simultaneously)
      const { data: existingBooking } = await service
        .from('bookings')
        .select('id, status, check_in, check_out, listing_id, total_price, deposit_amount')
        .eq('id', bookingId)
        .single();

      if (!existingBooking || !['pending', 'awaiting_payment'].includes(existingBooking.status)) break;

      // Verify payment amount matches expected booking price
      const expectedAmount = isDeposit
        ? (existingBooking as any).deposit_amount
        : (existingBooking as any).total_price;
      if (expectedAmount && Math.abs(paidAmount - expectedAmount) >= 0.01) {
        console.error(`Payment amount mismatch for booking ${bookingId}: received €${paidAmount}, expected €${expectedAmount}`);
        break;
      }

      // Check no other booking was confirmed for these dates in the meantime
      const { data: conflict } = await service
        .from('bookings')
        .select('id')
        .eq('listing_id', existingBooking.listing_id)
        .eq('status', 'confirmed')
        .neq('id', bookingId)
        .lt('check_in', existingBooking.check_out)
        .gt('check_out', existingBooking.check_in)
        .limit(1)
        .maybeSingle();

      if (conflict) {
        // Another booking took the dates — cancel this one and issue refund via Stripe dashboard
        await service.from('bookings').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: 'Date conflict — another booking was confirmed first',
        }).eq('id', bookingId);
        console.error(`Double-booking conflict for booking ${bookingId} — dates already taken by ${conflict.id}`);
        break;
      }

      const { data: booking, error } = await service
        .from('bookings')
        .update({
          payment_status: isDeposit ? 'deposit_paid' : 'paid',
          amount_paid: paidAmount,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent,
          ...(isDeposit ? {} : { platform_fee: platformFee, owner_payout: ownerPayoutAmt, payout_status: payoutStatus }),
        })
        .eq('id', bookingId)
        .select('*, listings(title,slug,city,address,country,check_in_time,check_out_time,cancellation_policy,owner_id,telegram_channels(chat_id))')
        .single();

      if (booking && !error) {
        const listing = (booking as any).listings;
        if (listing) {
          // Email: guest gets deposit/payment confirmation
          if (isDeposit) {
            sendDepositReceived(booking, listing).catch(console.error);
          } else {
            sendBookingConfirmed(booking, listing).catch(console.error);
          }

          // Email: owner gets notification
          if (listing.owner_id) {
            const { data: ownerProf } = await service.from('profiles').select('email').eq('id', listing.owner_id).single();
            if (ownerProf?.email) {
              sendOwnerNotification({
                ownerEmail: ownerProf.email,
                eventType: isDeposit ? 'deposit_paid' : 'fully_paid',
                booking, listing,
              }).catch(console.error);
            }
          }

          // Telegram: notify owner + listing channel of confirmed card payment
          const listingChatId = listing.telegram_channels?.chat_id ?? null;
          const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
          const ref = bookingId.slice(0, 8).toUpperCase();
          const paidAmt = isDeposit ? (booking as any).deposit_amount : booking.total_price;
          const nights = Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000);
          const alertText = [
            isDeposit ? `💳 <b>Deposit Paid by Card — Booking Confirmed!</b>` : `💳 <b>Card Payment Confirmed — Booking Confirmed!</b>`,
            `<b>${listing.title}</b>`,
            ``,
            `👤 ${booking.guest_name}`,
            `📧 ${booking.guest_email}${booking.guest_phone ? ` · 📞 ${booking.guest_phone}` : ''}`,
            `📅 ${booking.check_in} → ${booking.check_out} · ${nights} nights`,
            `👥 ${(booking.guests_adults ?? 0) + (booking.guests_children ?? 0)} guests`,
            isDeposit
              ? `💶 Deposit paid: <b>€${paidAmt}</b>  ·  Remaining on arrival: <b>€${(booking as any).remaining_amount ?? (booking.total_price - paidAmt)}</b>`
              : `💶 Total paid: <b>€${booking.total_price} ${booking.currency ?? 'EUR'}</b>`,
            ``,
            `✅ Booking automatically confirmed — payment received.`,
            `🔖 Ref: <code>${ref}</code>`,
            `<a href="${siteUrl}/admin/bookings/${bookingId}">Open in admin →</a>`,
          ].join('\n');
          sendSimpleAlert(alertText, 'notify_booking_confirmed', listingChatId, listing.owner_id ?? null).catch(console.error);
        }

        // Deposit/payment goes to platform Stripe account.
        // Owner receives remainder directly from guest — payout_status stays 'pending' until owner is paid.

        // Admin event + push: payment confirmed
        const payPushMsg = `${booking.guest_name} · ${listing?.title ?? 'Listing'} · €${paidAmount} · Ref: ${bookingId.slice(0, 8).toUpperCase()}`;
        emitAdminEvent({
          type: isDeposit ? 'payment.deposit_received' : 'payment.full_received',
          title: isDeposit ? 'Deposit paid by card' : 'Full payment received by card',
          message: payPushMsg,
          entity_type: 'bookings',
          entity_id: bookingId,
          owner_id: listing?.owner_id ?? null,
        }).catch(() => {});
        await pushToAdminsAndOwner({ type: isDeposit ? 'deposit_received' : 'payment_received', message: payPushMsg, actor_name: booking.guest_name, owner_id: listing?.owner_id ?? null });

        await service.from('audit_logs').insert({
          action: 'booking.payment_received',
          entity_type: 'bookings',
          entity_id: bookingId,
          payload: {
            amount: paidAmount,
            platform_fee: platformFee,
            owner_payout: ownerPayoutAmt,
            stripe_session: session.id,
          },
        });
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as any;
      const bookingId = session.metadata?.booking_id;
      if (!bookingId) break;

      // Cancel bookings that are still awaiting payment (or pending for legacy)
      await service.from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: 'Payment session expired' })
        .eq('id', bookingId)
        .in('status', ['pending', 'awaiting_payment']);
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as any;
      const bookingId = pi.metadata?.booking_id;
      if (!bookingId) break;
      await service.from('bookings').update({ payment_status: 'unpaid' }).eq('stripe_payment_intent_id', pi.id);
      break;
    }

    // Owner paid commission invoice
    case 'invoice.paid': {
      const invoice   = event.data.object as any;
      const bookingId = invoice.metadata?.booking_id;
      if (!bookingId) break;
      await service.from('bookings')
        .update({ commission_invoice_status: 'paid' })
        .eq('commission_invoice_id', invoice.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice   = event.data.object as any;
      const bookingId = invoice.metadata?.booking_id;
      if (!bookingId) break;
      await service.from('bookings')
        .update({ commission_invoice_status: 'failed' })
        .eq('commission_invoice_id', invoice.id);
      break;
    }

    // ── Owner subscription: created or renewed ──────────────────────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as any;
      const profileId = sub.metadata?.profile_id;
      if (!profileId) break;

      if (sub.status === 'active' || sub.status === 'trialing') {
        const expiresAt = new Date(sub.current_period_end * 1000);
        await activateSubscription(service, profileId, sub.id, expiresAt);
      } else if (['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(sub.status)) {
        await deactivateSubscription(service, profileId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as any;
      const profileId = sub.metadata?.profile_id;
      if (!profileId) break;
      await deactivateSubscription(service, profileId);
      break;
    }

  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
