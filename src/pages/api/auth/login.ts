import type { APIRoute } from 'astro';
import { createSupabaseServerClient, getServiceClient } from '../../../lib/supabase.ts';
import { authLimiter, getClientIp } from '../../../lib/rate-limit.ts';
import { emitAdminEvent } from '../../../lib/admin-events.ts';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const ip = getClientIp(request);
  if (!authLimiter.check(ip)) {
    return redirect('/admin/login?error=rate_limited');
  }

  const formData = await request.formData();
  const email    = formData.get('email') as string;
  const password = formData.get('password') as string;
  const next     = (formData.get('next') as string) || '/admin';

  if (!email || !password) {
    return redirect(`/admin/login?error=missing&next=${encodeURIComponent(next)}`);
  }

  const supabase = createSupabaseServerClient(request, cookies);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Surface specific error types for better UX
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('email') && msg.includes('confirm')) {
      return redirect(`/admin/login?error=unconfirmed&next=${encodeURIComponent(next)}`);
    }
    return redirect(`/admin/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  // After sign-in, verify the user has admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin', 'property_owner', 'restaurant_owner'].includes(profile.role)) {
      await supabase.auth.signOut();
      return redirect(`/admin/login?error=unauthorized&next=${encodeURIComponent(next)}`);
    }

    // Detect first login for property/restaurant owners (invite accepted)
    if (profile.role === 'property_owner' || profile.role === 'restaurant_owner') {
      try {
        const svc = getServiceClient();
        const { data: authUser } = await svc.auth.admin.getUserById(user.id);
        // If last_sign_in_at is null or very recent (within 60s of created_at), it's first login
        const created = new Date(authUser?.user?.created_at ?? 0).getTime();
        const lastLogin = authUser?.user?.last_sign_in_at ? new Date(authUser.user.last_sign_in_at).getTime() : 0;
        if (!lastLogin || (lastLogin - created) < 120000) {
          emitAdminEvent({
            type: 'owner.accepted_invite',
            title: 'Owner accepted invite',
            message: `${user.email} has set their password and logged in for the first time.`,
            entity_type: 'profiles',
            entity_id: user.id,
          }).catch(() => {});
        }
      } catch {}
    }
  }

  return redirect(next);
};
