import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

/**
 * POST /api/admin/restaurant-owners/invite
 * Super admin invites a new restaurant owner.
 * Creates the auth user + profile with restaurant_owner role.
 * Body: { email, full_name }
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const profile = locals.profile;
  if (!profile || profile.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const { email, full_name } = body;
  if (!email || !full_name) {
    return new Response(JSON.stringify({ error: 'Email and name are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  // Create auth user with temp password
  const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, role: 'restaurant_owner' },
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const userId = authData.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'User creation failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Upsert profile with restaurant_owner role
  await service.from('profiles').upsert({
    id: userId,
    email,
    role: 'restaurant_owner',
    full_name,
  }, { onConflict: 'id' });

  // Generate password-recovery link
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const { data: linkData } = await service.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/admin/set-password` },
  });

  const inviteLink = linkData?.properties?.action_link ?? null;

  // Send invite email
  if (inviteLink) {
    try {
      const { sendRestaurantOwnerInvite } = await import('../../../../lib/email.ts');
      await sendRestaurantOwnerInvite(email, full_name, inviteLink);
    } catch (e) {
      console.error('Failed to send invite email:', e);
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    user_id: userId,
    message: `Invitation sent to ${email}`,
  }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

/**
 * PATCH /api/admin/restaurant-owners/invite
 * Update a restaurant owner's profile fields.
 * Body: { id, full_name?, phone? }
 */
export const PATCH: APIRoute = async ({ locals, request }) => {
  const profile = locals.profile;
  if (!profile || profile.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { id, full_name, phone } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  const service = getServiceClient();
  const updates: Record<string, any> = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (phone !== undefined) updates.phone = phone;

  if (Object.keys(updates).length > 0) {
    await service.from('profiles').update(updates).eq('id', id);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

/**
 * DELETE /api/admin/restaurant-owners/invite
 * Remove a restaurant owner — deletes auth user (cascades profile).
 * Body: { id }
 */
export const DELETE: APIRoute = async ({ locals, request }) => {
  const profile = locals.profile;
  if (!profile || profile.role !== 'super_admin') {
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

  // Unlink restaurants from this owner
  await service.from('restaurants').update({ owner_id: null }).eq('owner_id', id);

  // Delete auth user (cascades to profile)
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
