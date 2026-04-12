import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const role = locals.profile?.role;
  if (!['admin', 'super_admin', 'property_owner'].includes(role ?? '')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const listingId = params.id;

  // Property owners can only update their own listings
  if (role === 'property_owner') {
    const ownerIds = locals.ownerListingIds ?? [];
    if (!ownerIds.includes(listingId)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const body = await request.json();

  // Whitelist of fields that can be updated via this endpoint
  const allowed = ['google_place_id'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { error } = await service
    .from('listings')
    .update(updates)
    .eq('id', listingId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
