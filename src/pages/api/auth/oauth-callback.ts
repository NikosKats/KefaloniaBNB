import type { APIRoute } from 'astro';

/**
 * GET /api/auth/oauth-callback
 * Supabase redirects here after Google OAuth with ?code=...
 * Serves a client-side page that:
 * 1. Exchanges the code (needs PKCE verifier from localStorage)
 * 2. Posts session tokens to server to set cookies
 * 3. Ensures profile exists in DB
 * 4. Redirects to /community/board
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response(null, { status: 302, headers: { Location: '/community/join?error=no_code' } });
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Logging in...</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f4f5;">
<div style="text-align:center;">
  <div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#1a1a2e;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
  <p style="font-size:16px;color:#333;margin:0;">Logging you in...</p>
  <p id="status" style="font-size:13px;color:#999;margin-top:8px;"></p>
</div>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
<script type="module">
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

  const supabase = createClient('${supabaseUrl}', '${supabaseAnonKey}');
  const status = document.getElementById('status');

  try {
    // 1. Exchange code for session (PKCE verifier is in localStorage)
    const { data, error } = await supabase.auth.exchangeCodeForSession('${code}');

    if (error) throw new Error(error.message);
    if (!data?.session || !data?.user) throw new Error('No session returned');

    status.textContent = 'Setting up your account...';

    // 2. Set session cookies on server
    await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
    });

    // 3. Ensure profile exists in DB
    const user = data.user;
    await fetch('/api/auth/ensure-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        provider: user.app_metadata?.provider || 'email',
      }),
    });

    // 4. Redirect
    window.location.href = '/community/board';
  } catch (e) {
    status.textContent = e.message;
    status.style.color = '#ef4444';
    console.error('OAuth callback error:', e);
    setTimeout(() => window.location.href = '/community/join?error=auth_failed', 3000);
  }
<\/script>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
};
