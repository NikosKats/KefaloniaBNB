import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendPushToUser } from '../../../../lib/push.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Please log in to like' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { comment_id } = await request.json();
  if (!comment_id) {
    return new Response(JSON.stringify({ error: 'comment_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const userId = locals.session.user.id;

  const { data: existing } = await service
    .from('community_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('comment_id', comment_id)
    .maybeSingle();

  if (existing) {
    await service.from('community_likes').delete().eq('id', existing.id);
    return new Response(JSON.stringify({ liked: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } else {
    await service.from('community_likes').insert({ user_id: userId, comment_id });

    // Push notification to comment author
    const { data: comment } = await service.from('community_comments').select('author_id, body').eq('id', comment_id).single();
    const { data: actor } = await service.from('profiles').select('full_name').eq('id', userId).single();
    if (comment && comment.author_id !== userId) {
      await sendPushToUser({ user_id: comment.author_id, type: 'comment_liked', actor_name: actor?.full_name ?? 'Someone', actor_id: userId, comment_id, message: comment.body?.slice(0, 80) });
    }

    return new Response(JSON.stringify({ liked: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};
