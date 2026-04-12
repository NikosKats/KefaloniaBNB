import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { requireAdmin } from '../../../lib/cleaning/permissions.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // SECURITY: Only admins can modify reviews
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const body = await request.json();
  // Allowlist updatable fields to prevent arbitrary field injection
  const allowed: Record<string, unknown> = {};
  for (const key of ['is_published', 'title', 'body', 'rating', 'guest_name', 'guest_country', 'source', 'stay_date']) {
    if (key in body) allowed[key] = body[key];
  }

  const service = getServiceClient();
  const { data, error } = await service.from('reviews').update(allowed).eq('id', params.id).select().single();
  if (error) return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  // SECURITY: Only admins can delete reviews
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const service = getServiceClient();
  await service.from('reviews').delete().eq('id', params.id);
  return new Response(null, { status: 204 });
};
