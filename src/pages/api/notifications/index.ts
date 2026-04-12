import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

// GET: list notifications for current user
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 50);
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const service = getServiceClient();
  const { data, error } = await service
    .from('user_notifications')
    .select('*')
    .eq('user_id', locals.session.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ notifications: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// PATCH: mark notifications as read
export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json().catch(() => ({}));
  const service = getServiceClient();
  const userId = locals.session.user.id;

  if (body.all) {
    // Mark all as read
    await service
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  } else if (body.id) {
    // Mark single as read
    await service
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('user_id', userId);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
