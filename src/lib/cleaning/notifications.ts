import type { SupabaseClient } from '@supabase/supabase-js';

type NotificationType =
  | 'new_request'
  | 'bid_received'
  | 'bid_accepted'
  | 'bid_rejected'
  | 'job_scheduled'
  | 'job_started'
  | 'job_completed'
  | 'job_approved'
  | 'payment_received'
  | 'payout_sent'
  | 'dispute_raised'
  | 'dispute_resolved';

export async function notify(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>
) {
  await supabase.from('cleaning_notifications').insert({
    user_id: userId,
    type,
    payload,
  });
}

export async function notifyMany(
  supabase: SupabaseClient,
  userIds: string[],
  type: NotificationType,
  payload: Record<string, unknown>
) {
  if (!userIds.length) return;
  await supabase.from('cleaning_notifications').insert(
    userIds.map(user_id => ({ user_id, type, payload }))
  );
}
