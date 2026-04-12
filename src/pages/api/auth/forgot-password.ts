import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { passwordResetLimiter, getClientIp, rateLimitResponse } from '../../../lib/rate-limit.ts';

/**
 * POST /api/auth/forgot-password
 * Public endpoint — sends a password-reset email for the given address.
 * Always returns 200 so we don't leak whether the email exists.
 * Body: { email, context?: 'community' | 'admin' }
 */
export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  if (!passwordResetLimiter.check(ip)) return rateLimitResponse();

  let email: string | undefined;
  let context: string | undefined;
  try {
    ({ email, context } = await request.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
  }

  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const anon = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );

  // Redirect to the appropriate set-password page based on context
  const redirectPath = context === 'community' ? '/community/set-password' : '/admin/set-password';

  await anon.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${siteUrl}${redirectPath}`,
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
