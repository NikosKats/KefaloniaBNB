import type { APIRoute } from 'astro';
import { getServiceClient, createSupabaseServerClient } from '../../../lib/supabase.ts';

/**
 * POST /api/auth/set-guest-password
 * Allows setting a password either:
 * 1. By a logged-in user (session-based)
 * 2. By providing a valid guest_token from a booking (token-based, for when auto-login failed)
 *
 * After setting, signs the user in so the session is established.
 */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const body = await request.json().catch(() => null);
  const password = body?.password;
  const guestToken = body?.guest_token;

  if (!password || typeof password !== 'string' || password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, 400);
  }

  const service = getServiceClient();
  let userId: string | null = null;
  let email: string | null = null;

  if (locals.session) {
    // Authenticated: use session
    userId = locals.session.user.id;
    email = locals.session.user.email;
  } else if (guestToken) {
    // Unauthenticated: verify via guest_token
    const { data: booking } = await service
      .from('bookings')
      .select('guest_user_id, guest_email')
      .eq('guest_token', guestToken)
      .eq('email_verified', true)
      .single();

    if (!booking?.guest_user_id) {
      return json({ error: 'Invalid or unverified booking token' }, 403);
    }

    userId = booking.guest_user_id;
    email = booking.guest_email;
  } else {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (!userId) return json({ error: 'No account found' }, 404);

  // Set the new password via admin API
  const { error } = await service.auth.admin.updateUser(userId, { password });
  if (error) return json({ error: error.message }, 500);

  // Sign in with the new password to establish session
  if (email) {
    const supabase = createSupabaseServerClient(request, cookies);
    await supabase.auth.signInWithPassword({ email, password });
  }

  return json({ ok: true }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
