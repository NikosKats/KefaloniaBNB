import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendOwnerInvite } from '../../../../lib/email.ts';
import { requireSuperAdmin } from '../../../../lib/cleaning/permissions.ts';

/**
 * POST /api/admin/owners/invite
 * Super admin invites a new property owner.
 * Creates the auth user + profile with property_owner role.
 * Body: { email, full_name, company_name?, commission_rate? }
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { email, full_name, company_name, commission_rate } = body;
  if (!email || !full_name) {
    return new Response(JSON.stringify({ error: 'email and full_name are required' }), { status: 400 });
  }

  const service = getServiceClient();

  // Create Supabase auth user with a temporary password (they'll reset it)
  const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400 });
  }

  const userId = authData.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'User creation failed' }), { status: 500 });
  }

  // Read platform default commission rate as fallback
  const { data: commSetting } = await service
    .from('platform_settings')
    .select('value')
    .eq('key', 'commission_rate')
    .single();
  const platformRate = commSetting ? Number(commSetting.value) : 5;
  const ownerRate = (commission_rate !== undefined && !isNaN(Number(commission_rate)))
    ? Number(commission_rate)
    : platformRate;

  // Upsert the profile with property_owner role.
  // Using upsert (not update) because Supabase's on-signup trigger may not have
  // run yet by the time we reach this line — update would silently affect 0 rows
  // and the trigger would later create the profile with the default role.
  const { error: profileError } = await service
    .from('profiles')
    .upsert({
      id: userId,
      email,
      role: 'property_owner',
      full_name,
      company_name: company_name ?? null,
      commission_rate: ownerRate,
    }, { onConflict: 'id' });

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500 });
  }

  // Generate a password-recovery link the new owner can use to set their password
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/admin/set-password` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return new Response(
      JSON.stringify({ error: 'Failed to generate invite link' }),
      { status: 500 }
    );
  }

  await sendOwnerInvite(email, full_name, linkData.properties.action_link);

  return new Response(
    JSON.stringify({ ok: true, user_id: userId, message: `Invitation sent to ${email}` }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};

/**
 * PATCH /api/admin/owners/invite
 * Update an owner's commission rate or profile fields.
 * Body: { id, commission_rate?, full_name?, company_name? }
 */
export const PATCH: APIRoute = async ({ locals, request }) => {
  const profile = locals.profile;
  if (!profile || profile.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { id, commission_rate, full_name, company_name } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  const service = getServiceClient();

  // Update profile
  const profileUpdates: Record<string, any> = {};
  if (full_name !== undefined) profileUpdates.full_name = full_name;
  if (company_name !== undefined) profileUpdates.company_name = company_name;
  if (commission_rate !== undefined) profileUpdates.commission_rate = Number(commission_rate);

  if (Object.keys(profileUpdates).length > 0) {
    await service.from('profiles').update(profileUpdates).eq('id', id);
  }

  // Update commission_rate on all their listings if specified
  if (commission_rate !== undefined) {
    await service.from('listings').update({ commission_rate: Number(commission_rate) }).eq('owner_id', id);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

/**
 * DELETE /api/admin/owners/invite
 * Deactivate an owner (set role back to blocked / delete user).
 * Body: { id }
 */
export const DELETE: APIRoute = async ({ locals, request }) => {
  const profile = locals.profile;
  if (!profile || profile.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { id } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  const service = getServiceClient();

  // Delete their listings (they're owner-specific test/real properties)
  await service.from('listings').delete().eq('owner_id', id);

  // Delete the auth user (cascade deletes profile)
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
