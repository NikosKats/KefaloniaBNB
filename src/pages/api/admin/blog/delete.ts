import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

const J = { 'Content-Type': 'application/json' };

export const DELETE: APIRoute = async ({ locals, request }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;
  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: J });

  const service = getServiceClient();
  const { error } = await service.from('blog_posts').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: J });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};
