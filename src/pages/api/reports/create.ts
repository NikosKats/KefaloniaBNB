import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

const CATEGORIES = ['road_damage', 'water_supply', 'electricity', 'waste', 'street_lighting', 'stray_animals', 'noise', 'flooding', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { title, description, category, severity, location, latitude, longitude, reporter_name, reporter_email, reporter_phone, photo_urls } = body;

  if (!title?.trim() || !description?.trim() || !category || !CATEGORIES.includes(category)) {
    return new Response(JSON.stringify({ error: 'Title, description, and valid category are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const userId = locals.session?.user?.id ?? null;

  const { data, error } = await service.from('reports').insert({
    title: title.trim(),
    description: description.trim(),
    category,
    severity: SEVERITIES.includes(severity) ? severity : 'medium',
    location: location?.trim() || null,
    latitude: latitude || null,
    longitude: longitude || null,
    reporter_name: reporter_name?.trim() || null,
    reporter_email: reporter_email?.trim() || null,
    reporter_phone: reporter_phone?.trim() || null,
    photo_urls: Array.isArray(photo_urls) ? photo_urls.slice(0, 5) : [],
    ...(userId ? { author_id: userId } : {}),
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ report: data }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
