import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, redirect, request }) => {
  const role = locals.profile?.role;
  await locals.supabase.auth.signOut();

  // Check for custom redirect
  try {
    const body = await request.json();
    if (body.redirect) return redirect(body.redirect);
  } catch {}

  if (role === 'member') return redirect('/community/board');
  if (role === 'cleaner') return redirect('/cleaner/login');
  return redirect('/admin/login');
};
