import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendPushToUser } from '../../../lib/push.ts';

// GET: list conversations for current user
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const service = getServiceClient();
  const userId = locals.session.user.id;

  const { data: convs } = await service
    .from('conversations')
    .select('id, participant_1, participant_2, last_message_at, last_message_preview, p1:profiles!conversations_participant_1_fkey(id, full_name, avatar_url), p2:profiles!conversations_participant_2_fkey(id, full_name, avatar_url)')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  const conversations = (convs ?? []).map((c: any) => {
    const other = c.participant_1 === userId ? c.p2 : c.p1;
    return {
      id: c.id,
      other_user: other,
      last_message_at: c.last_message_at,
      last_message_preview: c.last_message_preview,
    };
  });

  // Get unread counts per conversation
  for (const conv of conversations) {
    const { count } = await service
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('is_read', false)
      .neq('sender_id', userId);
    (conv as any).unread_count = count ?? 0;
  }

  return json({ conversations }, 200);
};

// POST: send a message (finds or creates conversation)
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const { recipient_id, body } = await request.json();
  if (!recipient_id || !body?.trim()) return json({ error: 'recipient_id and body required' }, 400);

  const userId = locals.session.user.id;
  if (recipient_id === userId) return json({ error: 'Cannot message yourself' }, 400);

  const service = getServiceClient();

  // Find existing conversation
  const p1 = userId < recipient_id ? userId : recipient_id;
  const p2 = userId < recipient_id ? recipient_id : userId;

  let { data: conv } = await service
    .from('conversations')
    .select('id')
    .eq('participant_1', p1)
    .eq('participant_2', p2)
    .maybeSingle();

  // If not found, try reversed (LEAST/GREATEST index handles this but query needs to match)
  if (!conv) {
    ({ data: conv } = await service
      .from('conversations')
      .select('id')
      .eq('participant_1', p2)
      .eq('participant_2', p1)
      .maybeSingle());
  }

  // Create if not exists
  if (!conv) {
    const { data: newConv, error: convErr } = await service
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2 })
      .select('id')
      .single();
    if (convErr) return json({ error: convErr.message }, 500);
    conv = newConv;
  }

  // Insert message
  const { data: msg, error: msgErr } = await service
    .from('messages')
    .insert({ conversation_id: conv!.id, sender_id: userId, body: body.trim() })
    .select('id, conversation_id, sender_id, body, is_read, created_at')
    .single();

  if (msgErr) return json({ error: msgErr.message }, 500);

  // Send push to recipient
  const { data: actor } = await service.from('profiles').select('full_name').eq('id', userId).single();
  await sendPushToUser({ user_id: recipient_id, type: 'new_message', actor_name: actor?.full_name ?? 'Someone', actor_id: userId, message: body.trim().slice(0, 80) });

  return json({ message: msg, conversation_id: conv!.id }, 201);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
