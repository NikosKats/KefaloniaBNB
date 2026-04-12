import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const fd      = await request.formData();
  const chat_id = fd.get('chat_id') as string;
  const token   = import.meta.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chat_id) return redirect('/admin/telegram?msg=error');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id,
      text: '✅ <b>Test message</b>\n\nThis channel is correctly configured to receive booking notifications from KefaloniaBNB.',
      parse_mode: 'HTML',
    }),
  });

  const json = await res.json() as any;
  return redirect(json.ok ? '/admin/telegram?msg=tested' : '/admin/telegram?msg=test-fail');
};
