import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireSuperAdmin } from '../../../../lib/cleaning/permissions.ts';

const J = { 'Content-Type': 'application/json' };

export const PATCH: APIRoute = async ({ locals, request }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  const { id, allow } = await request.json();
  if (!id || typeof allow !== 'boolean') {
    return new Response(JSON.stringify({ error: 'id and allow (boolean) required' }), { status: 400, headers: J });
  }

  const service = getServiceClient();
  const { error } = await service
    .from('profiles')
    .update({ allow_host_messaging: allow })
    .eq('id', id)
    .eq('role', 'property_owner');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: J });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};
