import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Please log in to report' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { post_id, comment_id, reason } = await request.json();
  if (!reason?.trim() || (!post_id && !comment_id)) {
    return new Response(JSON.stringify({ error: 'Target and reason are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { error } = await service.from('community_reports').insert({
    reporter_id: locals.session.user.id,
    post_id: post_id || null,
    comment_id: comment_id || null,
    reason: reason.trim(),
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
