import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

/**
 * POST /api/push/subscribe
 * Saves a push subscription for the authenticated user.
 * Body: { endpoint, keys: { p256dh, auth } }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return new Response(JSON.stringify({ error: 'Invalid subscription data' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { error } = await service
    .from('push_subscriptions')
    .upsert({
      user_id: locals.session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get('user-agent') ?? null,
    }, { onConflict: 'user_id,endpoint' });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

/**
 * DELETE /api/push/subscribe
 * Removes a push subscription.
 * Body: { endpoint }
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!body.endpoint) {
    return new Response(JSON.stringify({ error: 'Endpoint required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  await service
    .from('push_subscriptions')
    .delete()
    .eq('user_id', locals.session.user.id)
    .eq('endpoint', body.endpoint);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
