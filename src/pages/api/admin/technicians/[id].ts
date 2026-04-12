import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const fields = ['name', 'phone', 'email', 'bio', 'category_id', 'service_areas', 'is_active', 'is_verified', 'website', 'google_maps_url', 'google_business_url', 'facebook_url', 'instagram_url', 'cover_photo', 'photo_urls'];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  updates.updated_at = new Date().toISOString();
  const service = getServiceClient();
  const { data, error } = await service.from('technicians').update(updates).eq('id', params.id).select('*, technician_categories(slug, name_en, name_el)').single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ technician: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { error } = await service.from('technicians').delete().eq('id', params.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
