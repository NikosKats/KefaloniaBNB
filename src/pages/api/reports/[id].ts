import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const userId = locals.session.user.id;

  // Fetch report to check ownership
  const { data: report } = await service.from('reports').select('author_id').eq('id', params.id).single();
  if (!report) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Allow author or admin/super_admin
  const { data: profile } = await service.from('profiles').select('role').eq('id', userId).single();
  const role = profile?.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  if (report.author_id !== userId && !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const { error } = await service.from('reports').delete().eq('id', params.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
