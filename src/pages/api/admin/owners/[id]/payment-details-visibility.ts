import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireSuperAdmin } from '../../../../../lib/cleaning/permissions.ts';

/**
 * POST /api/admin/owners/:id/payment-details-visibility
 * Body: { show: boolean }
 * Super-admin only — toggle whether the owner sees the Bank Transfer section in their profile.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing owner id' }), { status: 400 });

  const { show } = await request.json();

  const service = getServiceClient();
  const { error } = await service
    .from('profiles')
    .update({ show_payment_details: !!show })
    .eq('id', id)
    .eq('role', 'property_owner');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ show: !!show }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
