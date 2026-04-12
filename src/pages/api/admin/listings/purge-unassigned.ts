import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireSuperAdmin } from '../../../../lib/cleaning/permissions.ts';

const J = { 'Content-Type': 'application/json' };

/** DELETE /api/admin/listings/purge-unassigned — remove all listings with no owner */
export const DELETE: APIRoute = async ({ locals }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  const service = getServiceClient();
  const { error, count } = await service
    .from('listings')
    .delete({ count: 'exact' })
    .is('owner_id', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: J });
  }

  return new Response(JSON.stringify({ ok: true, deleted: count ?? 0 }), { status: 200, headers: J });
};
