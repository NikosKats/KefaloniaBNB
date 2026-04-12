import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendGuestMagicLink } from '../../../lib/email.ts';

/**
 * POST /api/auth/guest-magic-link
 * Sends a passwordless login link to a guest's email.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { email } = body;
  if (!email || typeof email !== 'string') return json({ error: 'Email is required' }, 400);

  const service = getServiceClient();

  // Find user by email
  const { data: { users } } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = (users ?? []).find((u: any) => u.email === email.toLowerCase().trim());

  if (!user) {
    // Don't reveal whether the email exists — still return success
    return json({ sent: true }, 200);
  }

  // Only allow members (guests + community) to use magic link — not admins/owners/cleaners
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single();
  if (profile && profile.role !== 'member') {
    return json({ sent: true }, 200);
  }

  // Create magic link token
  const { data: link, error } = await service
    .from('guest_magic_links')
    .insert({
      user_id: user.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select('token')
    .single();

  if (error || !link) {
    return json({ error: 'Failed to create login link' }, 500);
  }

  // Send email
  await sendGuestMagicLink(email, link.token);

  return json({ sent: true }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
