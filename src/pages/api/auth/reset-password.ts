import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/reset-password
 * Sends a password-reset email to the currently logged-in user.
 * Requires an active session — middleware already guards /api/admin/* but
 * this route lives under /api/auth/* so we check the session manually.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const session = locals.session;
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const anon = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );

  const { error } = await anon.auth.resetPasswordForEmail(session.user.email, {
    redirectTo: `${siteUrl}/admin/set-password`,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
