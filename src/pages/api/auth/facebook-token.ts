import type { APIRoute } from 'astro';
import { getServiceClient, createSupabaseServerClient } from '../../../lib/supabase.ts';

/**
 * POST /api/auth/facebook-token
 * Receives a Facebook access token from the FB JS SDK,
 * verifies it, creates/finds the Supabase user, sets session cookies.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: any;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { access_token } = body;
  if (!access_token) return json({ error: 'access_token is required' }, 400);

  // 1. Verify token with Facebook and get user info
  let fbUser: any;
  try {
    const fbRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${access_token}`
    );
    if (!fbRes.ok) return json({ error: 'Invalid Facebook token' }, 401);
    fbUser = await fbRes.json();
  } catch {
    return json({ error: 'Failed to verify token' }, 500);
  }

  if (!fbUser?.id) return json({ error: 'Invalid Facebook response' }, 401);

  const email = fbUser.email || `fb_${fbUser.id}@facebook.local`;
  const fullName = fbUser.name || 'Facebook User';
  const avatarUrl = fbUser.picture?.data?.url || null;

  const service = getServiceClient();

  // 2. Find or create auth user
  let userId: string | null = null;
  const sessionPass = crypto.randomUUID();

  // Check if auth user exists by email
  const { data: { users } } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingAuthUser = (users ?? []).find((u: any) => u.email === email);

  if (existingAuthUser) {
    userId = existingAuthUser.id;
    // Set password for session creation
    await service.auth.admin.updateUser(userId, { password: sessionPass });
  } else {
    // Create new auth user
    const { data: newUser, error: createErr } = await service.auth.admin.createUser({
      email,
      password: sessionPass,
      email_confirm: true,
      user_metadata: { full_name: fullName, facebook_id: fbUser.id, avatar_url: avatarUrl, role: 'member' },
    });

    if (createErr) return json({ error: createErr.message }, 400);
    userId = newUser?.user?.id ?? null;
  }

  if (!userId) return json({ error: 'Failed to create user' }, 500);

  // 3. Ensure profile exists
  const { data: existingProfile } = await service.from('profiles').select('id').eq('id', userId).single();

  if (existingProfile) {
    const updates: Record<string, any> = { auth_provider: 'facebook' };
    if (avatarUrl) updates.avatar_url = avatarUrl;
    await service.from('profiles').update(updates).eq('id', userId);
  } else {
    await service.from('profiles').insert({
      id: userId,
      email,
      full_name: fullName,
      role: 'member',
      avatar_url: avatarUrl,
      auth_provider: 'facebook',
    });
  }

  // 4. Sign in to set session cookies
  const supabase = createSupabaseServerClient(request, cookies);
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: sessionPass });

  if (signInErr) return json({ error: 'Session creation failed: ' + signInErr.message }, 500);

  return json({ ok: true }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
