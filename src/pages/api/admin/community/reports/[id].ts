import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const service = getServiceClient();
  const { data, error } = await service
    .from('community_reports')
    .update({ status: body.status ?? 'reviewed' })
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ report: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
