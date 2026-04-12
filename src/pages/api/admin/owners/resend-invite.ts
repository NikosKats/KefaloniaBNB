import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendOwnerInvite } from '../../../../lib/email.ts';

/**
 * POST /api/admin/owners/resend-invite
 * Resends the invite email to an owner who hasn't accepted yet.
 * Body: { id }
 */
export const POST: APIRoute = async ({ locals, request }) => {
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

  // Fetch the owner profile
  const { data: ownerProfile, error: profileErr } = await service
    .from('profiles')
    .select('email, full_name')
    .eq('id', id)
    .eq('role', 'property_owner')
    .single();

  if (profileErr || !ownerProfile) {
    return new Response(JSON.stringify({ error: 'Owner not found' }), { status: 404 });
  }

  // Generate a new recovery link
  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'recovery',
    email: ownerProfile.email,
    options: { redirectTo: `${siteUrl}/admin/set-password` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return new Response(JSON.stringify({ error: 'Failed to generate invite link' }), { status: 500 });
  }

  // Send the invite email
  await sendOwnerInvite(ownerProfile.email, ownerProfile.full_name ?? 'Owner', linkData.properties.action_link);

  return new Response(
    JSON.stringify({ ok: true, message: `Invite resent to ${ownerProfile.email}` }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
