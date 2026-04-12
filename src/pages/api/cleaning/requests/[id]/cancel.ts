import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireSession } from '../../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ params, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const service = getServiceClient();

  const { data: req } = await service
    .from('cleaning_requests')
    .select('id, status, owner_id')
    .eq('id', params.id!)
    .single();

  if (!req) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  if (req.owner_id !== userId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  if (!['open', 'matched'].includes(req.status)) {
    return new Response(JSON.stringify({ error: `Cannot cancel a request with status "${req.status}"` }), { status: 409 });
  }

  const { error } = await service
    .from('cleaning_requests')
    .update({ status: 'cancelled' })
    .eq('id', params.id!);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
