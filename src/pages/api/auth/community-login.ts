import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json();
  const { email, password } = body;

  if (!email?.trim() || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createSupabaseServerClient(request, cookies);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';

    // Supabase returns "Email not confirmed" when the user hasn't verified
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return new Response(JSON.stringify({
        error: 'Please verify your email before logging in. Check your inbox for the confirmation link.',
        code: 'EMAIL_NOT_CONFIRMED',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid email or password', debug: error.message }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, user: { id: data.user.id, email: data.user.email } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
