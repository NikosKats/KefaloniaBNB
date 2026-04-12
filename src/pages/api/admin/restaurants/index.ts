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
  const { name, description, description_el, cuisine_type, address, city, phone, website, google_maps_url, latitude, longitude, cover_photo, photo_urls, price_range, features, opening_hours, is_partner, tripadvisor_url, google_business_url, facebook_url, instagram_url, owner_id } = body;

  if (!name?.trim()) {
    return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const service = getServiceClient();
  const { data, error } = await service.from('restaurants').insert({
    name: name.trim(),
    slug,
    description: description?.trim() || null,
    description_el: description_el?.trim() || null,
    cuisine_type: Array.isArray(cuisine_type) ? cuisine_type : [],
    address: address?.trim() || null,
    city: city?.trim() || 'Keramoti',
    phone: phone?.trim() || null,
    website: website?.trim() || null,
    google_maps_url: google_maps_url?.trim() || null,
    latitude: latitude || null,
    longitude: longitude || null,
    cover_photo: cover_photo || null,
    photo_urls: Array.isArray(photo_urls) ? photo_urls : [],
    price_range: price_range || null,
    features: Array.isArray(features) ? features : [],
    opening_hours: opening_hours || null,
    is_partner: !!is_partner,
    tripadvisor_url: tripadvisor_url?.trim() || null,
    google_business_url: google_business_url?.trim() || null,
    facebook_url: facebook_url?.trim() || null,
    instagram_url: instagram_url?.trim() || null,
    owner_id: owner_id || null,
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ restaurant: data }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
