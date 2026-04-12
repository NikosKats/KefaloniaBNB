import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase.ts';
import { getServiceClient } from '../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData        = await request.formData();
  const full_name       = (formData.get('full_name') as string)?.trim();
  const email           = (formData.get('email') as string)?.trim();
  const phone           = (formData.get('phone') as string)?.trim() || null;
  const password        = formData.get('password') as string;
  const confirm         = formData.get('confirm_password') as string;

  if (!full_name || !email || !password) {
    return redirect('/cleaner/signup?error=missing');
  }
  if (password.length < 8) {
    return redirect('/cleaner/signup?error=weak');
  }
  if (password !== confirm) {
    return redirect('/cleaner/signup?error=mismatch');
  }

  const supabase = createSupabaseServerClient(request, cookies);

  // Sign up via Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'https://kefaloniabnb.com/cleaner/login',
      data: { full_name },
    },
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('already')) return redirect('/cleaner/signup?error=exists');
    return redirect('/cleaner/signup?error=failed');
  }

  // Create the profile row with cleaner role using service client (bypasses RLS)
  if (data.user) {
    const service = getServiceClient();
    await service.from('profiles').upsert({
      id:        data.user.id,
      full_name,
      phone,
      role:      'cleaner',
    }, { onConflict: 'id' });
  }

  return redirect('/cleaner/signup?success=1');
};
