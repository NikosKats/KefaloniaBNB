import type { APIRoute } from 'astro';
import { CreateBookingSchema } from '../../../lib/validators.ts';
import { getServiceClient } from '../../../lib/supabase.ts';
import { calculatePriceClient, calculateCouponDiscount } from '../../../lib/pricing.ts';
import { createCheckoutSession } from '../../../lib/stripe.ts';
import { sendBookingReceived, sendVerificationEmail } from '../../../lib/email.ts';
import { sendBookingAlert, sendTelegramDirectAlert, sendSimpleAlert } from '../../../lib/telegram.ts';
import { bookingLimiter, getClientIp, rateLimitResponse } from '../../../lib/rate-limit.ts';
import type { Listing, Season } from '../../../types/index.ts';
import { emitAdminEvent } from '../../../lib/admin-events.ts';
import { pushToAdminsAndOwner } from '../../../lib/push.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  const ip = getClientIp(request);
  if (!bookingLimiter.check(ip)) return rateLimitResponse();

  try {
    const body = await request.json();
    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const input = parsed.data;
    const service = getServiceClient();

    // 1. Fetch listing (authoritative source for pricing) + its Telegram channel
    const isTelegramDirectReq = input.payment_method === 'telegram_direct';
    const { data: listing, error: listingErr } = await service
      .from('listings')
      .select('*, telegram_channels(chat_id)')
      .eq('id', input.listing_id)
      .eq('is_active', true)
      .single();

    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Validate: listing must be active (published)
    if (!listing.is_active) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    // Validate payment method availability
    if (isTelegramDirectReq && !listing.allow_telegram_direct) {
      return new Response(JSON.stringify({ error: 'Telegram Direct booking is not available for this listing' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (input.payment_method === 'stripe' && !listing.instant_booking) {
      return new Response(JSON.stringify({ error: 'Stripe payment is not available for this listing' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (input.payment_method === 'bank_transfer' && !listing.offer_bank_transfer) {
      return new Response(JSON.stringify({ error: 'Bank transfer is not available for this listing' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Validate min nights
    const msPerDay = 1000 * 60 * 60 * 24;
    const nights = Math.round((new Date(input.check_out).getTime() - new Date(input.check_in).getTime()) / msPerDay);
    if (nights < listing.min_nights) {
      return new Response(JSON.stringify({ error: `Minimum stay is ${listing.min_nights} nights` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (listing.max_nights && nights > listing.max_nights) {
      return new Response(JSON.stringify({ error: `Maximum stay is ${listing.max_nights} nights` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Validate guest count
    const totalGuests = input.guests_adults + (input.guests_children ?? 0);
    if (totalGuests > listing.max_guests) {
      return new Response(JSON.stringify({ error: `Maximum ${listing.max_guests} guests allowed` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Atomically check availability via DB function
    const { data: available, error: avErr } = await service.rpc('check_availability', {
      p_listing_id: input.listing_id,
      p_check_in: input.check_in,
      p_check_out: input.check_out,
    });
    if (avErr || !available) {
      return new Response(JSON.stringify({ error: 'Those dates are no longer available. Please choose different dates.' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. Server-side price calculation (NEVER trust client price)
    const { data: seasons } = await service.from('seasons').select('*').eq('listing_id', input.listing_id);

    let couponDiscount = 0;
    let couponId: string | null = null;
    if (input.coupon_code) {
      const { data: coupon } = await service
        .from('coupons')
        .select('*')
        .eq('code', input.coupon_code.toUpperCase())
        .eq('is_active', true)
        .single();
      if (coupon) {
        // Re-validate expiry and listing restriction (validate endpoint checks too, but never trust client flow)
        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
          return new Response(JSON.stringify({ error: 'Coupon not yet active' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
          return new Response(JSON.stringify({ error: 'Coupon has expired' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        if (coupon.listing_id && coupon.listing_id !== input.listing_id) {
          return new Response(JSON.stringify({ error: 'Coupon not valid for this property' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Atomic increment with max_uses guard to prevent race condition
        let incrementQuery = service
          .from('coupons')
          .update({ uses_count: coupon.uses_count + 1 })
          .eq('id', coupon.id);
        if (coupon.max_uses) {
          incrementQuery = incrementQuery.lt('uses_count', coupon.max_uses);
        }
        const { data: updated } = await incrementQuery.select('id');
        if (coupon.max_uses && (!updated || updated.length === 0)) {
          return new Response(JSON.stringify({ error: 'Coupon usage limit reached' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const preliminary = calculatePriceClient(listing as Listing, input.check_in, input.check_out, totalGuests, seasons as Season[] ?? []);
        couponDiscount = calculateCouponDiscount(coupon, preliminary.baseTotal, preliminary.extraGuestFee);
        couponId = coupon.id;
      }
    }

    const price = calculatePriceClient(listing as Listing, input.check_in, input.check_out, totalGuests, seasons as Season[] ?? [], couponDiscount);

    // 6. Calculate platform fee / owner payout split
    const commissionRate = listing.commission_rate ?? 0;
    const platformFee  = Math.round(price.total * commissionRate) / 100;
    const ownerPayout  = Math.round((price.total - platformFee) * 100) / 100;

    // 7. Determine payment flow
    const paymentMethod: 'stripe' | 'bank_transfer' | 'telegram_direct' =
      input.payment_method === 'bank_transfer' ? 'bank_transfer'
      : input.payment_method === 'telegram_direct' ? 'telegram_direct'
      : 'stripe';
    const paymentType: 'full' | 'deposit' = input.payment_type === 'deposit' ? 'deposit' : 'full';
    const isInstantStripe = paymentMethod === 'stripe' && listing.instant_booking;
    const isTelegramDirect = paymentMethod === 'telegram_direct';

    // Deposit calculation
    const depositPercent = listing.deposit_percent ?? 30;
    const depositAmount  = paymentType === 'deposit' ? Math.round(price.total * depositPercent) / 100 : 0;
    const remainingAmount = paymentType === 'deposit' ? Math.round((price.total - depositAmount) * 100) / 100 : 0;

    // 6. Insert booking
    // Stripe bookings start as 'awaiting_payment' — they're not real pending bookings yet.
    // Bank transfer and TD bookings start as 'pending' (awaiting owner approval).
    const initialStatus = paymentMethod === 'stripe' ? 'awaiting_payment' : 'pending';
    const { data: booking, error: insertErr } = await service
      .from('bookings')
      .insert({
        listing_id:      input.listing_id,
        status:          initialStatus,
        payment_method:  paymentMethod,
        payment_type:    paymentType,
        deposit_amount:  depositAmount,
        remaining_amount: remainingAmount,
        check_in:        input.check_in,
        check_out:       input.check_out,
        guests_adults:   input.guests_adults,
        guests_children: input.guests_children ?? 0,
        guests_infants:  input.guests_infants ?? 0,
        guests_pets:     input.guests_pets ?? 0,
        base_price:      price.basePrice,
        base_total:      price.baseTotal,
        cleaning_fee:    price.cleaningFee,
        extra_guest_fee: price.extraGuestFee,
        coupon_id:       couponId,
        coupon_discount: price.couponDiscount,
        taxes:           price.taxes,
        total_price:     price.total,
        currency:        'EUR',
        guest_name:      input.guest_name,
        guest_email:     input.guest_email,
        guest_phone:     input.guest_phone ?? null,
        guest_country:   input.guest_country ?? null,
        guest_message:   input.guest_message ?? null,
        payment_status:  'unpaid',
        source:          'direct',
        platform_fee:    platformFee,
        owner_payout:    ownerPayout,
        payout_status:   listing.owner_id ? 'pending' : 'na',
        // Email verification: logged-in users are pre-verified
        email_verified:  !!locals.session,
        guest_user_id:   locals.session?.user?.id ?? null,
        email_verification_expires_at: locals.session ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertErr || !booking) {
      return new Response(JSON.stringify({ error: 'Failed to create booking. Please try again.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Send verification email for non-logged-in guests
    const verificationRequired = !locals.session;
    if (verificationRequired && booking.email_verification_token) {
      sendVerificationEmail(
        booking,
        { title: listing.title, check_in_time: (listing as Listing).check_in_time, check_out_time: (listing as Listing).check_out_time },
        booking.email_verification_token,
      ).catch(console.error);
    }

    // 7. Audit log
    await service.from('audit_logs').insert({
      action: 'booking.created',
      entity_type: 'bookings',
      entity_id: booking.id,
      payload: { status: booking.status, total: booking.total_price },
    });

    // 7b. Admin event for dashboard notification
    const ref = booking.id.slice(0, 8).toUpperCase();
    const pmLabel = paymentMethod === 'stripe' ? 'Stripe' : paymentMethod === 'telegram_direct' ? 'Telegram Direct' : 'Bank Transfer';
    emitAdminEvent({
      type: 'booking.created',
      title: `New booking request — ${pmLabel}`,
      message: `${booking.guest_name} · ${listing.title} · €${booking.total_price} · ${booking.check_in} → ${booking.check_out} · Ref: ${ref}`,
      entity_type: 'bookings',
      entity_id: booking.id,
      owner_id: listing.owner_id ?? null,
    }).catch(() => {});

    // 7c. Push notifications to super admins + property owner
    const pushMsg = `${booking.guest_name} · ${listing.title} · €${booking.total_price} · ${booking.check_in} → ${booking.check_out}`;
    await pushToAdminsAndOwner({ type: 'new_booking', message: pushMsg, actor_name: booking.guest_name, owner_id: listing.owner_id });

    // 8. Send notification emails + Telegram alert
    // Fetch listing owner's email + bank details for notification routing
    let ownerEmail: string | null = null;
    let ownerPaymentDetails: { payment_account_name?: string | null; payment_revolut?: string | null; payment_wise?: string | null; payment_iban?: string | null; payment_bic?: string | null } | null = null;
    if (listing.owner_id) {
      const { data: ownerProfile } = await service
        .from('profiles')
        .select('email, payment_account_name, payment_revolut, payment_wise, payment_iban, payment_bic')
        .eq('id', listing.owner_id)
        .single();
      ownerEmail = ownerProfile?.email ?? null;
      ownerPaymentDetails = ownerProfile ?? null;
    }

    // Send email notifications for all payment methods
    // Stripe: guest gets "booking received", owner gets "new booking" — webhook will send confirmation after payment
    sendBookingReceived(booking, listing as Listing, ownerEmail, ownerPaymentDetails ?? undefined).catch(console.error);

    // Send Telegram alert — awaited directly so Cloudflare Workers doesn't drop it before completion
    const listingChatId = (listing as { telegram_channels?: { chat_id: string } | null }).telegram_channels?.chat_id ?? null;
    const listingOwnerId = listing.owner_id ?? null;
    if (isTelegramDirect) {
      // Telegram Direct: owner gets Accept/Decline via td_ callbacks — must complete before response
      try {
        const msgId = await sendTelegramDirectAlert(booking, listing as Listing, listingChatId, listingOwnerId);
        if (msgId) {
          await getServiceClient().from('bookings').update({ telegram_message_id: msgId }).eq('id', booking.id);
        }
      } catch (e) {
        console.error('TD Telegram alert failed:', e);
      }
    } else if (isInstantStripe) {
      // Stripe: notify owner that a card payment is in progress
      try {
        const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
        const ref = booking.id.slice(0, 8).toUpperCase();
        const nights = Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000);
        const alertText = [
          `🔄 <b>Card Payment In Progress</b>`,
          `<b>${listing.title}</b>`,
          ``,
          `👤 ${booking.guest_name} (${booking.guest_email})`,
          `📅 ${booking.check_in} → ${booking.check_out} · ${nights} nights`,
          `💶 ${paymentType === 'deposit' ? `Deposit: <b>€${depositAmount}</b> of €${booking.total_price}` : `Total: <b>€${booking.total_price} EUR</b>`}`,
          `🔖 Ref: <code>${ref}</code>`,
          ``,
          `⏳ Guest has been redirected to Stripe checkout. You'll be notified when payment completes.`,
          `<a href="${siteUrl}/admin/bookings/${booking.id}">Open in admin →</a>`,
        ].join('\n');
        await sendSimpleAlert(alertText, 'notify_booking_new', listingChatId, listingOwnerId);
      } catch (e) {
        console.error('Stripe Telegram alert failed:', e);
      }
    } else {
      // Bank transfer: owner gets Approve/Reject buttons
      try {
        const msgId = await sendBookingAlert(booking, listing as Listing, listingChatId, listingOwnerId);
        if (msgId) {
          await getServiceClient().from('bookings').update({ telegram_message_id: msgId }).eq('id', booking.id);
        }
      } catch (e) {
        console.error('Bank transfer Telegram alert failed:', e);
      }
    }

    // 9. Branch by payment method
    const siteUrl = import.meta.env.PUBLIC_SITE_URL;

    if (paymentMethod === 'stripe') {
      // ── Stripe: create checkout session immediately ───────────────────
      let session;
      try {
        session = await createCheckoutSession({
          booking,
          listing: listing as Listing,
          successUrl: `${siteUrl}/book/success?id=${booking.id}&pm=stripe&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl:  `${siteUrl}/book/${input.listing_id}?check_in=${input.check_in}&check_out=${input.check_out}&guests=${totalGuests}`,
          paymentType,
          ...(paymentType === 'deposit' && { chargeAmount: depositAmount }),
        });
      } catch (stripeErr: any) {
        // Stripe failed — delete the booking so dates aren't blocked on retry
        await service.from('bookings').delete().eq('id', booking.id);
        console.error('Stripe session creation failed:', stripeErr);
        return new Response(JSON.stringify({ error: 'Payment setup failed. Please try again or choose bank transfer.' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      await service.from('bookings').update({ stripe_session_id: session.id }).eq('id', booking.id);

      return new Response(JSON.stringify({ bookingId: booking.id, checkoutUrl: session.url, verificationRequired }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Telegram Direct or Bank transfer ────────────────────────────────
    return new Response(JSON.stringify({ bookingId: booking.id, paymentMethod, verificationRequired }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Booking create error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
