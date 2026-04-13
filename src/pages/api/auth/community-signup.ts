import type { APIRoute } from 'astro';
import { createSupabaseServerClient, getServiceClient } from '../../../lib/supabase.ts';
import { pushToAdminsAndOwner } from '../../../lib/push.ts';
import { awardPoints } from '../../../lib/points.ts';
import { createLockedWelcomeReward } from '../../../lib/welcomeReward.ts';

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json();
  const { full_name, email, password } = body;
  const refSource = cookies.get('ref_source')?.value ?? null;

  if (!full_name?.trim() || !email?.trim() || !password) {
    return new Response(JSON.stringify({ error: 'Name, email, and password are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createSupabaseServerClient(request, cookies);
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || '';

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: full_name.trim(), role: 'member' },
      emailRedirectTo: `${siteUrl}/community/board`,
    },
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('already')) {
      return new Response(JSON.stringify({ error: 'An account with this email already exists. Please log in.' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (data.user) {
    const service = getServiceClient();
    await service.from('profiles').upsert({
      id: data.user.id,
      email: email.trim(),
      full_name: full_name.trim(),
      role: 'member',
    }, { onConflict: 'id' });

    // ── Gamification: signup bonus + locked welcome reveal ───────────
    // Fire-and-forget: never block signup on gamification side-effects.
    // ref_source (if present) is stored as refId on the signup ledger row so
    // admins can batch-credit referrers later via the referral dashboard.
    Promise.all([
      awardPoints(data.user.id, 'signup', { refId: refSource ?? undefined }),
      createLockedWelcomeReward(data.user.id),
    ]).catch((e) => console.error('[signup] gamification hooks failed', e));
  }

  // Push notification to admins about new member
  if (data.user) {
    await pushToAdminsAndOwner({ type: 'new_member_signup', message: `${full_name.trim()} (${email.trim()}) joined the community`, actor_name: full_name.trim() });
  }

  // Check if email confirmation is needed
  // When confirmation is required, data.session will be null
  const needsConfirmation = !data.session;

  return new Response(JSON.stringify({
    ok: true,
    needs_confirmation: needsConfirmation,
  }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
