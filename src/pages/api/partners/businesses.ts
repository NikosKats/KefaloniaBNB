import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

const J = { 'Content-Type': 'application/json' };
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

// POST — create business
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const body = await request.json();
  const { name, type, location_slug, location_name, description, highlight, address, phone, website, google_maps_url, price_range, featured, interest_id } = body;

  if (!name || !type || !location_slug || !location_name || !description)
    return err('name, type, location_slug, location_name, description are required');

  const service = getServiceClient();
  const { data, error } = await service.from('partner_businesses').insert({
    name: name.trim(),
    type,
    location_slug,
    location_name,
    description: description.trim(),
    highlight: highlight?.trim() || null,
    address: address?.trim() || null,
    phone: phone?.trim() || null,
    website: website?.trim() || null,
    google_maps_url: google_maps_url?.trim() || null,
    price_range: price_range || null,
    featured: featured ?? false,
    interest_id: interest_id || null,
    status: 'active',
  }).select().single();

  if (error) return err(error.message, 500);

  // If linked to an interest, mark it approved
  if (interest_id) {
    await service.from('partner_interests').update({ status: 'approved' }).eq('id', interest_id);
  }

  return new Response(JSON.stringify({ business: data }), { status: 201, headers: J });
};

// PATCH — update business
export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const { id, ...fields } = await request.json();
  if (!id) return err('id required');

  const allowed = ['name','type','description','highlight','address','phone','website','google_maps_url','price_range','featured','status','sort_order'];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (fields[k] !== undefined) update[k] = fields[k];
  }

  const service = getServiceClient();
  const { error } = await service.from('partner_businesses').update(update).eq('id', id);
  if (error) return err(error.message, 500);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};

// DELETE — remove business
export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const { id } = await request.json();
  if (!id) return err('id required');

  const service = getServiceClient();
  const { error } = await service.from('partner_businesses').delete().eq('id', id);
  if (error) return err(error.message, 500);
  return new Response(null, { status: 204 });
};
