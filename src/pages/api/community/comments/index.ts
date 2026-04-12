import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendPushToUser } from '../../../../lib/push.ts';

// POST: add a comment
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Please log in to comment' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const { post_id, parent_id, body: commentBody, photo_url } = body;

  if (!post_id || !commentBody?.trim()) {
    return new Response(JSON.stringify({ error: 'Post ID and comment body are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('full_name')
    .eq('id', locals.session.user.id)
    .single();

  const { data, error } = await service.from('community_comments').insert({
    post_id,
    parent_id: parent_id || null,
    author_id: locals.session.user.id,
    author_name: profile?.full_name ?? 'Anonymous',
    body: commentBody.trim(),
    photo_url: photo_url || null,
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Send push notification to post author (non-blocking)
  const { data: post } = await service.from('community_posts').select('author_id').eq('id', post_id).single();
  if (post && post.author_id !== locals.session.user.id) {
    await sendPushToUser({ user_id: post.author_id, type: 'post_commented', actor_name: profile?.full_name ?? 'Someone', actor_id: locals.session.user.id, post_id, message: commentBody.trim().slice(0, 80) });
  }

  return new Response(JSON.stringify({ comment: data }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
