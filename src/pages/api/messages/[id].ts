import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

// GET: fetch messages in a conversation (paginated)
export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const service = getServiceClient();
  const userId = locals.session.user.id;
  const convId = params.id;

  // Verify user is participant
  const { data: conv } = await service
    .from('conversations')
    .select('id, participant_1, participant_2')
    .eq('id', convId)
    .single();

  if (!conv) return json({ error: 'Not found' }, 404);
  if (conv.participant_1 !== userId && conv.participant_2 !== userId) {
    return json({ error: 'Forbidden' }, 403);
  }

  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
  const before = url.searchParams.get('before'); // cursor for older messages

  let query = service
    .from('messages')
    .select('id, conversation_id, sender_id, body, is_read, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data: messages } = await query;

  return json({ messages: (messages ?? []).reverse() }, 200);
};

// PATCH: mark messages as read
export const PATCH: APIRoute = async ({ params, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const service = getServiceClient();
  const userId = locals.session.user.id;
  const convId = params.id;

  // Verify participation
  const { data: conv } = await service
    .from('conversations')
    .select('id, participant_1, participant_2')
    .eq('id', convId)
    .single();

  if (!conv) return json({ error: 'Not found' }, 404);
  if (conv.participant_1 !== userId && conv.participant_2 !== userId) {
    return json({ error: 'Forbidden' }, 403);
  }

  // Mark all unread messages from the OTHER person as read
  await service
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', convId)
    .eq('is_read', false)
    .neq('sender_id', userId);

  // Update unread count on profile
  const { count } = await service
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .neq('sender_id', userId)
    .in('conversation_id', (await service
      .from('conversations')
      .select('id')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    ).data?.map((c: any) => c.id) ?? []);

  await service.from('profiles').update({ unread_messages_count: count ?? 0 }).eq('id', userId);

  return json({ ok: true }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
