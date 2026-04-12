import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const role = locals.profile?.role;
  if (role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || typeof key !== 'string') {
    return new Response(JSON.stringify({ error: 'key is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { error } = await service
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
