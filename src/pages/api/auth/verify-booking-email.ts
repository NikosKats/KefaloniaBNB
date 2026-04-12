import type { APIRoute } from 'astro';
import { getServiceClient, createSupabaseRequestClient } from '../../../lib/supabase.ts';

/**
 * GET /api/auth/verify-booking-email?token=<uuid>
 * Verifies a guest's email, auto-creates a guest account, and signs them in.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) return Response.redirect(new URL('/verify-email?status=invalid', url).href, 302);

  const service = getServiceClient();

  // Look up booking by verification token
  const { data: booking } = await service
    .from('bookings')
    .select('id, guest_email, guest_name, guest_phone, guest_token, email_verified, email_verification_expires_at, guest_user_id')
    .eq('email_verification_token', token)
    .single();

  if (!booking) return Response.redirect(new URL('/verify-email?status=invalid', url).href, 302);

  if (booking.email_verified) {
    return Response.redirect(new URL(`/verify-email?status=success&token=${booking.guest_token}`, url).href, 302);
  }

  // Check expiry
  if (booking.email_verification_expires_at && new Date(booking.email_verification_expires_at) < new Date()) {
    return Response.redirect(new URL('/verify-email?status=expired', url).href, 302);
  }

  // Mark as verified
  await service.from('bookings').update({ email_verified: true }).eq('id', booking.id);

  // Find or create guest account
  let userId = booking.guest_user_id;

  if (!userId) {
    // Check if a profile already exists for this email (more reliable than listUsers)
    const { data: existingProfile } = await service
      .from('profiles')
      .select('id')
      .eq('email', booking.guest_email)
      .single();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create new auth user with a known temp password
      const tempPass = crypto.randomUUID();
      const { data: newUser, error: createErr } = await service.auth.admin.createUser({
        email: booking.guest_email,
        password: tempPass,
        email_confirm: true,
        user_metadata: {
          full_name: booking.guest_name,
          role: 'member',
        },
      });

      if (createErr) {
        console.error('Failed to create guest user:', createErr.message);
        return Response.redirect(new URL(`/verify-email?status=success&token=${booking.guest_token}`, url).href, 302);
      }

      userId = newUser?.user?.id ?? null;

      // Create profile
      if (userId) {
        await service.from('profiles').upsert({
          id: userId,
          email: booking.guest_email,
          full_name: booking.guest_name,
          phone: booking.guest_phone,
          role: 'member',
          auth_provider: 'email',
        }, { onConflict: 'id' });
      }
    }

    // Link booking to user
    if (userId) {
      await service.from('bookings').update({ guest_user_id: userId }).eq('id', booking.id);

      // Also link any other bookings from this email
      await service
        .from('bookings')
        .update({ guest_user_id: userId })
        .eq('guest_email', booking.guest_email)
        .is('guest_user_id', null);
    }
  }

  // Auto-login: build response manually so Set-Cookie headers are included in the redirect
  const redirectUrl = new URL(`/verify-email?status=success&token=${booking.guest_token}`, url).href;

  if (userId) {
    try {
      const { data: { user: authUser } } = await service.auth.admin.getUserById(userId);
      if (authUser?.email) {
        // Set a known password and sign in to get session cookies
        const sessionPass = crypto.randomUUID();
        await service.auth.admin.updateUser(userId, { password: sessionPass });

        // Use request client that writes Set-Cookie to response headers
        const responseHeaders = new Headers();
        const supabase = createSupabaseRequestClient(request, responseHeaders);
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: authUser.email,
          password: sessionPass,
        });

        if (!signInErr) {
          responseHeaders.set('Location', redirectUrl);
          return new Response(null, { status: 302, headers: responseHeaders });
        }
        console.error('Auto-login sign-in failed:', signInErr.message);
      }
    } catch (e: any) {
      console.error('Auto-login after verification failed:', e?.message);
    }
  }

  // Fallback: redirect without session
  return Response.redirect(redirectUrl, 302);
};
