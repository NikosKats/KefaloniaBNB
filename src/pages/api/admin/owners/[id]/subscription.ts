import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { SUBSCRIPTION_COMMISSION_RATE, DEFAULT_COMMISSION_RATE } from '../../../../../lib/stripe.ts';
import { requireSuperAdmin } from '../../../../../lib/cleaning/permissions.ts';

/**
 * POST /api/admin/owners/:id/subscription
 * Super-admin manual toggle of an owner's subscription.
 * Activates if currently inactive, deactivates if currently active.
 */
export const POST: APIRoute = async ({ params, locals }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing owner id' }), { status: 400 });

  const service = getServiceClient();

  const { data: owner, error } = await service
    .from('profiles')
    .select('id, subscription_active')
    .eq('id', id)
    .eq('role', 'property_owner')
    .single();

  if (error || !owner) {
    return new Response(JSON.stringify({ error: 'Owner not found' }), { status: 404 });
  }

  const activate = !owner.subscription_active;

  if (activate) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    await service.from('profiles').update({
      subscription_active:    true,
      subscription_expires_at: expiresAt.toISOString(),
    }).eq('id', id);
    // Set 3% commission on all their listings
    await service.from('listings')
      .update({ commission_rate: SUBSCRIPTION_COMMISSION_RATE })
      .eq('owner_id', id);
  } else {
    await service.from('profiles').update({
      subscription_active:    false,
      subscription_expires_at: null,
    }).eq('id', id);
    // Revert to 5% commission on all their listings
    await service.from('listings')
      .update({ commission_rate: DEFAULT_COMMISSION_RATE })
      .eq('owner_id', id);
  }

  return new Response(JSON.stringify({ active: activate }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
