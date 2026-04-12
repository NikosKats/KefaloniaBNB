import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

// GET: fetch own profile
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from('profiles')
    .select('id, full_name, email, avatar_url, bio, phone, date_of_birth, location, hometown, cover_photo, facebook_url, instagram_url, created_at')
    .eq('id', locals.session.user.id)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ profile: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// PATCH: update own profile
export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const service = getServiceClient();

  const allowed = ['full_name', 'bio', 'phone', 'date_of_birth', 'location', 'hometown', 'avatar_url', 'cover_photo', 'facebook_url', 'instagram_url'];
  const updates: Record<string, unknown> = {};
  for (const f of allowed) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await service
    .from('profiles')
    .update(updates)
    .eq('id', locals.session.user.id)
    .select('id, full_name, email, avatar_url, bio, phone, date_of_birth, location, hometown, cover_photo, facebook_url, instagram_url')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ profile: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
