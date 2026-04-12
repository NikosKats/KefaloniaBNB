import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase.ts';

/**
 * POST /api/auth/set-session
 * Sets the Supabase session cookies from access_token + refresh_token.
 * Called from the client-side after OAuth code exchange.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) {
    return new Response(JSON.stringify({ error: 'Tokens required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createSupabaseServerClient(request, cookies);
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
