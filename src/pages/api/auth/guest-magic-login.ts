import type { APIRoute } from 'astro';
import { getServiceClient, createSupabaseServerClient } from '../../../lib/supabase.ts';

/**
 * GET /api/auth/guest-magic-login?token=<uuid>
 * Validates magic link token and signs the guest in.
 */
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) return redirect('/my-bookings?error=invalid');

  const service = getServiceClient();

  // Look up magic link
  const { data: link } = await service
    .from('guest_magic_links')
    .select('id, user_id, expires_at, used')
    .eq('token', token)
    .single();

  if (!link) return redirect('/my-bookings?error=invalid');
  if (link.used) return redirect('/my-bookings?error=used');
  if (new Date(link.expires_at) < new Date()) return redirect('/my-bookings?error=expired');

  // Mark as used
  await service.from('guest_magic_links').update({ used: true }).eq('id', link.id);

  // Get user email
  const { data: { user } } = await service.auth.admin.getUserById(link.user_id);
  if (!user?.email) return redirect('/my-bookings?error=invalid');

  // Sign in using temp password pattern (same as facebook-token.ts)
  const sessionPass = crypto.randomUUID();
  await service.auth.admin.updateUser(link.user_id, { password: sessionPass });

  const supabase = createSupabaseServerClient(request, cookies);
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: sessionPass,
  });

  if (signInErr) {
    console.error('Magic link sign-in failed:', signInErr);
    return redirect('/my-bookings?error=auth_failed');
  }

  return redirect('/my-bookings');
};
