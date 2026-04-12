import { getServiceClient } from './supabase.ts';

interface AdminEvent {
  type: string;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: string;
  owner_id?: string | null;
}

/**
 * Insert an admin event for real-time dashboard notifications.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function emitAdminEvent(event: AdminEvent): Promise<void> {
  try {
    await getServiceClient().from('admin_events').insert({
      type: event.type,
      title: event.title,
      message: event.message ?? null,
      entity_type: event.entity_type ?? null,
      entity_id: event.entity_id ?? null,
      owner_id: event.owner_id ?? null,
    });
  } catch (err) {
    console.error('Failed to emit admin event:', err);
  }
}
