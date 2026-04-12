import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/resend-confirmation
 * Resends the email confirmation link.
 * Always returns 200 to not leak whether the email exists.
 * Body: { email }
 */
export const POST: APIRoute = async ({ request }) => {
  let email: string | undefined;
  try {
    ({ email } = await request.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const siteUrl = import.meta.env.PUBLIC_SITE_URL || '';
  const anon = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );

  // Resend signup confirmation
  await anon.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${siteUrl}/community/board`,
    },
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
