import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase.ts';
import { authLimiter, getClientIp } from '../../../lib/rate-limit.ts';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const ip = getClientIp(request);
  if (!authLimiter.check(ip)) {
    return redirect('/cleaner/login?error=rate_limited');
  }

  const formData = await request.formData();
  const email    = formData.get('email') as string;
  const password = formData.get('password') as string;
  const next     = url.searchParams.get('next') ?? '/cleaner/dashboard';

  if (!email || !password) {
    return redirect(`/cleaner/login?error=missing&next=${encodeURIComponent(next)}`);
  }

  const supabase = createSupabaseServerClient(request, cookies);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('email') && msg.includes('confirm')) {
      return redirect(`/cleaner/login?error=unconfirmed&next=${encodeURIComponent(next)}`);
    }
    return redirect(`/cleaner/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  // Verify cleaner role
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'cleaner') {
      await supabase.auth.signOut();
      return redirect(`/cleaner/login?error=unauthorized&next=${encodeURIComponent(next)}`);
    }
  }

  return redirect(next);
};
