import type { APIRoute } from 'astro';
import { ListingSchema } from '../../../../lib/validators.ts';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const { id } = params;
  const service = getServiceClient();

  // Middleware only populates profile for /api/admin/* — fetch it here if missing
  let profile = locals.profile;
  if (!profile) {
    const { data } = await service.from('profiles').select('role').eq('id', locals.session.user.id).single();
    profile = data;
  }

  // SECURITY: Verify user is admin or owns this listing
  const role = profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    if (role !== 'property_owner') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    // Verify ownership
    const { data: listing } = await service.from('listings').select('owner_id').eq('id', id!).single();
    if (!listing || listing.owner_id !== locals.session.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }
  const body = await request.json();
  const { amenity_ids, title_i18n, tagline_i18n, description_i18n, house_rules_i18n, ...rest } = body;
  const parsed = ListingSchema.partial().safeParse(rest);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (title_i18n !== undefined) updateData.title_i18n = title_i18n;
  if (tagline_i18n !== undefined) updateData.tagline_i18n = tagline_i18n;
  if (description_i18n !== undefined) updateData.description_i18n = description_i18n;
  if (house_rules_i18n !== undefined) updateData.house_rules_i18n = house_rules_i18n;

  const { data: listing, error } = await service.from('listings').update(updateData).eq('id', id).select().single();
  if (error || !listing) return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  // Sync amenities
  if (amenity_ids !== undefined) {
    await service.from('listing_amenities').delete().eq('listing_id', id);
    if (amenity_ids.length) {
      await service.from('listing_amenities').insert(amenity_ids.map((aid: string) => ({ listing_id: id, amenity_id: aid })));
    }
  }

  await service.from('audit_logs').insert({ actor_id: locals.session.user.id, action: 'listing.updated', entity_type: 'listings', entity_id: id });

  return new Response(JSON.stringify({ listing }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const { id } = params;
  const service = getServiceClient();

  // Middleware only populates profile for /api/admin/* — fetch it here if missing
  let profileDel = locals.profile;
  if (!profileDel) {
    const { data } = await service.from('profiles').select('role').eq('id', locals.session.user.id).single();
    profileDel = data;
  }

  // SECURITY: Verify user is admin or owns this listing
  const role = profileDel?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    if (role !== 'property_owner') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const { data: ownCheck } = await service.from('listings').select('owner_id').eq('id', id!).single();
    if (!ownCheck || ownCheck.owner_id !== locals.session.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }
  const { error } = await service.from('listings').update({ is_active: false }).eq('id', id);
  if (error) return new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  await service.from('audit_logs').insert({ actor_id: locals.session.user.id, action: 'listing.deleted', entity_type: 'listings', entity_id: id });

  return new Response(null, { status: 204 });
};
