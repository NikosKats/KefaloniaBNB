import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { sendPushToUser } from '../../../../lib/push.ts';

// GET: list friends (accepted) + pending requests
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const service = getServiceClient();
  const userId = locals.session.user.id;

  // All friend rows involving this user
  const { data: rows } = await service
    .from('friends')
    .select('id, requester_id, addressee_id, status, created_at, requester:profiles!friends_requester_id_fkey(id, full_name, avatar_url, location), addressee:profiles!friends_addressee_id_fkey(id, full_name, avatar_url, location)')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false });

  const friends: any[] = [];
  const pendingReceived: any[] = [];
  const pendingSent: any[] = [];

  for (const row of rows ?? []) {
    const otherProfile = row.requester_id === userId ? row.addressee : row.requester;
    const entry = { id: row.id, status: row.status, created_at: row.created_at, profile: otherProfile };

    if (row.status === 'accepted') {
      friends.push(entry);
    } else if (row.status === 'pending') {
      if (row.addressee_id === userId) pendingReceived.push(entry);
      else pendingSent.push(entry);
    }
  }

  return json({ friends, pending_received: pendingReceived, pending_sent: pendingSent }, 200);
};

// POST: send friend request
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const { addressee_id } = await request.json();
  if (!addressee_id) return json({ error: 'addressee_id required' }, 400);

  const userId = locals.session.user.id;
  if (addressee_id === userId) return json({ error: 'Cannot friend yourself' }, 400);

  const service = getServiceClient();

  // Check if friendship already exists in either direction
  const { data: existing } = await service
    .from('friends')
    .select('id, status')
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${addressee_id}),and(requester_id.eq.${addressee_id},addressee_id.eq.${userId})`)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') return json({ error: 'Already friends' }, 409);
    if (existing.status === 'pending') return json({ error: 'Request already pending' }, 409);
    if (existing.status === 'blocked') return json({ error: 'Cannot send request' }, 403);
    // rejected — allow re-request by deleting old row and creating new
    await service.from('friends').delete().eq('id', existing.id);
  }

  const { data, error } = await service
    .from('friends')
    .insert({ requester_id: userId, addressee_id })
    .select('id')
    .single();

  if (error) return json({ error: error.message }, 500);

  // Send push to addressee
  const { data: actor } = await service.from('profiles').select('full_name').eq('id', userId).single();
  await sendPushToUser({ user_id: addressee_id, type: 'friend_request', actor_name: actor?.full_name ?? 'Someone', actor_id: userId });

  return json({ id: data.id, status: 'pending' }, 201);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
