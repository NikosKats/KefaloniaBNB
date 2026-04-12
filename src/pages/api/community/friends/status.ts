import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

// GET /api/community/friends/status?user_id=xxx
// Returns friendship status between current user and target user
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.session) return json({ status: 'none' }, 200);

  const targetId = url.searchParams.get('user_id');
  if (!targetId) return json({ error: 'user_id required' }, 400);

  const userId = locals.session.user.id;
  if (targetId === userId) return json({ status: 'self' }, 200);

  const service = getServiceClient();

  const { data: row } = await service
    .from('friends')
    .select('id, requester_id, addressee_id, status')
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`)
    .maybeSingle();

  if (!row) return json({ status: 'none', friend_id: null }, 200);

  // Determine direction for pending
  let direction = null;
  if (row.status === 'pending') {
    direction = row.requester_id === userId ? 'sent' : 'received';
  }

  return json({ status: row.status, friend_id: row.id, direction }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
