import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireSession } from '../../../../../lib/cleaning/permissions.ts';

export const GET: APIRoute = async ({ params, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const service = getServiceClient();
  const { data, error } = await service
    .from('job_photos')
    .select('*')
    .eq('job_id', params.id!)
    .order('created_at');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const body = await request.json().catch(() => null);
  if (!body?.url || !['before', 'after'].includes(body.phase)) {
    return new Response(JSON.stringify({ error: 'url and phase (before|after) required' }), { status: 400 });
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from('job_photos')
    .insert({ job_id: params.id!, url: body.url, phase: body.phase })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201 });
};
