import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendCleanerInvite } from '../../../../lib/email.ts';
import { requireSuperAdmin } from '../../../../lib/cleaning/permissions.ts';

/**
 * POST /api/admin/cleaners/invite
 * Invite a new cleaner by email. Creates auth user + profile + sends invite email.
 * Body: { email, full_name, phone? }
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { email, full_name, phone } = body;
  if (!email || !full_name) {
    return new Response(JSON.stringify({ error: 'email and full_name are required' }), { status: 400 });
  }

  const service = getServiceClient();

  // Create Supabase auth user (email confirmed, temporary password)
  const tempPassword = Math.random().toString(36).slice(-12) + 'Cc1!';
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

  // Update the auto-created profile to cleaner role
  const { error: profileError } = await service
    .from('profiles')
    .update({ role: 'cleaner', full_name, ...(phone ? { phone } : {}) })
    .eq('id', userId);

  if (profileError) {
    await service.auth.admin.deleteUser(userId);
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500 });
  }

  // Create cleaner_profiles row so they have a dashboard when they first log in
  const { error: cpError } = await service
    .from('cleaner_profiles')
    .insert({ user_id: userId });

  if (cpError && !cpError.message.includes('duplicate')) {
    console.warn('Failed to create cleaner_profiles row:', cpError.message);
  }

  // Generate password-recovery link → redirects to /cleaner/set-password
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/cleaner/set-password` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return new Response(JSON.stringify({ error: 'Failed to generate invite link' }), { status: 500 });
  }

  await sendCleanerInvite(email, full_name, linkData.properties.action_link);

  return new Response(
    JSON.stringify({ ok: true, user_id: userId }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};

/**
 * PATCH /api/admin/cleaners/invite
 * Update a cleaner's profile fields.
 * Body: { id, full_name?, phone?, is_active? }
 */
export const PATCH: APIRoute = async ({ locals, request }) => {
  if (!isSuperAdmin(locals)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { id, full_name, phone, is_active } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  const service = getServiceClient();

  // Update auth profile
  const profileUpdates: Record<string, any> = {};
  if (full_name !== undefined) profileUpdates.full_name = full_name;
  if (phone !== undefined) profileUpdates.phone = phone;
  if (Object.keys(profileUpdates).length > 0) {
    await service.from('profiles').update(profileUpdates).eq('id', id);
  }

  // Update cleaner_profile active status if provided
  if (is_active !== undefined) {
    await service.from('cleaner_profiles').update({ is_active }).eq('user_id', id);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

/**
 * DELETE /api/admin/cleaners/invite
 * Remove a cleaner — deletes their auth user (cascades to profile + cleaner_profile).
 * Body: { id }
 */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!isSuperAdmin(locals)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { id } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  const service = getServiceClient();
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
