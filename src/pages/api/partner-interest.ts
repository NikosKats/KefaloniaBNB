import type { APIRoute } from 'astro';
import { getServiceClient } from '../../lib/supabase.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { contact_name, business_name, business_type, email, message, location, location_slug } = body;

  if (!contact_name || !business_name || !business_type || !email) {
    return new Response(JSON.stringify({ error: 'Required fields missing' }), { status: 400, headers: JSON_HEADERS });
  }

  const service = getServiceClient();

  const { error } = await service.from('partner_interests').insert({
    contact_name: contact_name.trim(),
    business_name: business_name.trim(),
    business_type,
    email: email.trim().toLowerCase(),
    message: message?.trim() || null,
    location_name: location,
    location_slug: location_slug,
    status: 'new',
  });

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to save' }), { status: 500, headers: JSON_HEADERS });
  }

  // Telegram notification
  try {
    const { data: channels } = await service
      .from('telegram_channels')
      .select('chat_id')
      .eq('is_active', true);

    const telegramToken = import.meta.env.TELEGRAM_BOT_TOKEN;
    if (telegramToken && channels?.length) {
      const text = `🤝 *New Partner Interest*\n\n📍 ${location}\n🏪 ${business_name} (${business_type})\n👤 ${contact_name}\n📧 ${email}${message ? `\n💬 ${message}` : ''}\n\n→ Review: https://kefaloniabnb.com/admin/partners`;
      for (const ch of channels) {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: ch.chat_id, text, parse_mode: 'Markdown' }),
        }).catch(() => {});
      }
    }
  } catch { /* non-fatal */ }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
};
