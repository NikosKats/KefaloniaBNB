import type { APIRoute } from 'astro';
import { BlockDatesSchema } from '../../../lib/validators.ts';
import { getServiceClient } from '../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const parsed = BlockDatesSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  // SECURITY: Verify user is admin or owns the listing being blocked
  // Fetch profile via service client (locals.profile may not be set for non-admin API routes)
  const profile = locals.profile ?? (await getServiceClient().from('profiles').select('role').eq('id', locals.session.user.id).single()).data;
  const role = profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    if (role !== 'property_owner') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    // Property owners: verify they own this listing
    const { data: listing } = await getServiceClient().from('listings').select('owner_id').eq('id', parsed.data.listing_id).single();
    if (!listing || listing.owner_id !== locals.session.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const service = getServiceClient();
  const { data, error } = await service.from('blocked_dates').insert({ ...parsed.data, source: 'manual' }).select().single();

  if (error) return new Response(JSON.stringify({ error: 'Failed to block dates' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  await service.from('audit_logs').insert({ actor_id: locals.session.user.id, action: 'blocked_dates.created', entity_type: 'blocked_dates', entity_id: data.id });

  return new Response(JSON.stringify({ data }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const service = getServiceClient();

  // SECURITY: Verify user is admin or owns the listing for this blocked date
  const profile = locals.profile ?? (await service.from('profiles').select('role').eq('id', locals.session.user.id).single()).data;
  const role = profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    const { data: block } = await service.from('blocked_dates').select('listing_id').eq('id', id).single();
    if (!block) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (role !== 'property_owner') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const { data: listing } = await service.from('listings').select('owner_id').eq('id', block.listing_id).single();
    if (!listing || listing.owner_id !== locals.session.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const { error } = await service.from('blocked_dates').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: 'Failed to delete' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  return new Response(null, { status: 204 });
};
