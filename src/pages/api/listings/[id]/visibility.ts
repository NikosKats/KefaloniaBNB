import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

/**
 * PATCH /api/listings/:id/visibility
 * Body: { is_private: boolean }
 * Toggles whether a listing is hidden from the public site.
 * Owners may only toggle their own listings.
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  const body = await request.json().catch(() => null);
  if (body === null || typeof body.is_private !== 'boolean') {
    return new Response(JSON.stringify({ error: 'is_private (boolean) is required' }), { status: 400 });
  }

  const service = getServiceClient();
  const role = locals.profile?.role;
  const isOwner = role === 'property_owner';

  // Owners may only update their own listings
  if (isOwner) {
    const ownerListingIds: string[] = locals.ownerListingIds ?? [];
    if (!ownerListingIds.includes(id!)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
  }

  const { error } = await service
    .from('listings')
    .update({ is_private: body.is_private })
    .eq('id', id!);

  if (error) {
    return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
