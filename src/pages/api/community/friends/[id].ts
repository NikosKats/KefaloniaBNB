import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendPushToUser } from '../../../../lib/push.ts';

// PATCH: accept or reject friend request
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const { status } = await request.json();
  if (!status || !['accepted', 'rejected'].includes(status)) {
    return json({ error: 'status must be "accepted" or "rejected"' }, 400);
  }

  const service = getServiceClient();
  const userId = locals.session.user.id;

  // Only the addressee can accept/reject
  const { data: row } = await service
    .from('friends')
    .select('id, requester_id, addressee_id')
    .eq('id', params.id)
    .single();

  if (!row) return json({ error: 'Not found' }, 404);
  if (row.addressee_id !== userId) return json({ error: 'Only the recipient can respond' }, 403);

  await service.from('friends').update({ status, updated_at: new Date().toISOString() }).eq('id', row.id);

  // Send push to requester when accepted
  if (status === 'accepted') {
    const { data: actor } = await service.from('profiles').select('full_name').eq('id', userId).single();
    await sendPushToUser({ user_id: row.requester_id, type: 'friend_accepted', actor_name: actor?.full_name ?? 'Someone', actor_id: userId });
  }

  return json({ ok: true, status }, 200);
};

// DELETE: unfriend
export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const service = getServiceClient();
  const userId = locals.session.user.id;

  // Either party can unfriend
  const { data: row } = await service
    .from('friends')
    .select('id, requester_id, addressee_id')
    .eq('id', params.id)
    .single();

  if (!row) return json({ error: 'Not found' }, 404);
  if (row.requester_id !== userId && row.addressee_id !== userId) {
    return json({ error: 'Forbidden' }, 403);
  }

  await service.from('friends').delete().eq('id', row.id);
  return json({ ok: true }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
