import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

/**
 * POST /api/auth/ensure-profile
 * Called after OAuth login to ensure a profile row exists in the DB.
 * Body: { id, email, full_name, avatar_url, provider }
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { id, email, full_name, avatar_url, provider } = body;
  if (!id || !email) {
    return new Response(JSON.stringify({ error: 'id and email required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  // Check if profile exists
  const { data: existing } = await service
    .from('profiles')
    .select('id')
    .eq('id', id)
    .single();

  if (existing) {
    // Update auth_provider and avatar
    const updates: Record<string, any> = {};
    if (provider) updates.auth_provider = provider;
    if (avatar_url) updates.avatar_url = avatar_url;
    if (Object.keys(updates).length > 0) {
      await service.from('profiles').update(updates).eq('id', id);
    }
  } else {
    // Create new profile
    await service.from('profiles').insert({
      id,
      email,
      full_name: full_name || email.split('@')[0],
      role: 'member',
      avatar_url: avatar_url || null,
      auth_provider: provider || 'email',
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
