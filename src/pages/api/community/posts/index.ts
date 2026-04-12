import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendPushToUser } from '../../../../lib/push.ts';

// GET: list posts (paginated, filterable)
export const GET: APIRoute = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);
  const category = url.searchParams.get('category');
  const offset = (page - 1) * limit;

  const service = getServiceClient();
  let query = service
    .from('community_posts')
    .select('*', { count: 'exact' })
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, count, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ posts: data, total: count, page, limit }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// POST: create a new post
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Please log in to post' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const { category, title, body: postBody, photo_urls } = body;

  if (!postBody?.trim()) {
    return new Response(JSON.stringify({ error: 'Post body is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  // Get user profile
  const { data: profile } = await service
    .from('profiles')
    .select('full_name')
    .eq('id', locals.session.user.id)
    .single();

  const { data, error } = await service.from('community_posts').insert({
    author_id: locals.session.user.id,
    author_name: profile?.full_name ?? 'Anonymous',
    category: category || 'general',
    title: title?.trim() || null,
    body: postBody.trim(),
    photo_urls: Array.isArray(photo_urls) ? photo_urls.slice(0, 5) : [],
  }).select().single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Send push notifications to all users (non-blocking, best-effort)
  const authorId = locals.session.user.id;
  const authorName = profile?.full_name ?? 'Someone';
  const preview = (title?.trim() || postBody.trim()).slice(0, 80);
  const { data: allUsers } = await service
    .from('push_subscriptions')
    .select('user_id')
    .neq('user_id', authorId);
  const uniqueUserIds = [...new Set((allUsers ?? []).map((u: any) => u.user_id))];
  await Promise.allSettled(
    uniqueUserIds.map(uid => sendPushToUser({ user_id: uid, type: 'new_community_post', actor_name: authorName, actor_id: authorId, post_id: data.id, message: preview }))
  );

  return new Response(JSON.stringify({ post: data }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
