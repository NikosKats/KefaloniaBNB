import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendPushToUser } from '../../../../lib/push.ts';

// POST: toggle like on a post
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Please log in to like' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { post_id } = await request.json();
  if (!post_id) {
    return new Response(JSON.stringify({ error: 'post_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const userId = locals.session.user.id;

  // Check existing like
  const { data: existing } = await service
    .from('community_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', post_id)
    .maybeSingle();

  if (existing) {
    // Unlike
    await service.from('community_likes').delete().eq('id', existing.id);
    return new Response(JSON.stringify({ liked: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } else {
    // Like
    await service.from('community_likes').insert({ user_id: userId, post_id });

    // Send push notification to post author (non-blocking)
    const { data: post } = await service.from('community_posts').select('author_id, body').eq('id', post_id).single();
    const { data: actor } = await service.from('profiles').select('full_name').eq('id', userId).single();
    if (post && post.author_id !== userId) {
      await sendPushToUser({ user_id: post.author_id, type: 'post_liked', actor_name: actor?.full_name ?? 'Someone', actor_id: userId, post_id, message: post.body?.slice(0, 80) });
    }

    return new Response(JSON.stringify({ liked: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};
