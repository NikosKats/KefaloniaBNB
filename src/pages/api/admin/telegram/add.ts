import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const fd = await request.formData();
  const label                   = (fd.get('label') as string)?.trim();
  const chat_id                 = (fd.get('chat_id') as string)?.trim();
  const owner_id                = (fd.get('owner_id') as string)?.trim() || null;
  const notify_booking_new      = fd.get('notify_booking_new') === 'true';
  const notify_booking_confirmed = fd.get('notify_booking_confirmed') === 'true';
  const notify_booking_cancelled = fd.get('notify_booking_cancelled') === 'true';

  if (!label || !chat_id) return redirect('/admin/telegram?msg=error');

  const service = getServiceClient();
  const { error } = await service.from('telegram_channels').insert({
    label, chat_id,
    owner_id,
    is_active: true,
    notify_booking_new,
    notify_booking_confirmed,
    notify_booking_cancelled,
  });

  if (error) return redirect('/admin/telegram?msg=error');
  return redirect('/admin/telegram?msg=added');
};
