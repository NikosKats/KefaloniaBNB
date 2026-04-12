import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const { name, phone, email, bio, category_id, service_areas, is_verified, website, google_maps_url, google_business_url, facebook_url, instagram_url } = body;

  if (!name?.trim() || !phone?.trim() || !category_id) {
    return new Response(JSON.stringify({ error: 'Name, phone, and category are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { data, error } = await service.from('technicians').insert({
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() || null,
    bio: bio?.trim() || null,
    category_id,
    service_areas: Array.isArray(service_areas) ? service_areas : [],
    is_verified: !!is_verified,
    website: website?.trim() || null,
    google_maps_url: google_maps_url?.trim() || null,
    google_business_url: google_business_url?.trim() || null,
    facebook_url: facebook_url?.trim() || null,
    instagram_url: instagram_url?.trim() || null,
  }).select('*, technician_categories(slug, name_en, name_el)').single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ technician: data }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
