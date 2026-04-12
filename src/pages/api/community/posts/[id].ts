import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

// GET single post with comments
export const GET: APIRoute = async ({ params }) => {
  const service = getServiceClient();
  const { data: post, error } = await service
    .from('community_posts')
    .select('*')
    .eq('id', params.id)
    .eq('is_hidden', false)
    .single();

  if (error || !post) {
    return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const { data: comments } = await service
    .from('community_comments')
    .select('*')
    .eq('post_id', params.id)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true });

  return new Response(JSON.stringify({ post, comments: comments ?? [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

async function getUserRole(service: ReturnType<typeof getServiceClient>, userId: string, locals: any): Promise<string | null> {
  if (locals.profile?.role) return locals.profile.role;
  const { data } = await service.from('profiles').select('role').eq('id', userId).single();
  return data?.role ?? null;
}

// PATCH: edit own post or admin hide
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const service = getServiceClient();

  const { data: existing } = await service.from('community_posts').select('author_id').eq('id', params.id).single();
  if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const isOwner = existing.author_id === locals.session.user.id;
  const role = await getUserRole(service, locals.session.user.id, locals);
  const isAdmin = role === 'admin' || role === 'super_admin';
  if (!isOwner && !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const updates: Record<string, unknown> = {};
  if (body.body !== undefined) updates.body = body.body;
  if (body.title !== undefined) updates.title = body.title;
  if (body.category !== undefined) updates.category = body.category;
  if (body.photo_urls !== undefined) updates.photo_urls = body.photo_urls;
  if (isAdmin && body.is_hidden !== undefined) updates.is_hidden = body.is_hidden;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await service.from('community_posts').update(updates).eq('id', params.id).select().single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify({ post: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// DELETE: delete own post or admin
export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { data: existing } = await service.from('community_posts').select('author_id').eq('id', params.id).single();
  if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const isOwner = existing.author_id === locals.session.user.id;
  const role = await getUserRole(service, locals.session.user.id, locals);
  const isAdmin = role === 'admin' || role === 'super_admin';
  if (!isOwner && !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  await service.from('community_posts').delete().eq('id', params.id);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
