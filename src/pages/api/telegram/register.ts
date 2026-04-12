import type { APIRoute } from 'astro';
import { registerWebhook } from '../../../lib/telegram.ts';

/**
 * GET /api/telegram/register
 *
 * Registers the Telegram webhook with Telegram's servers.
 * Must be called ONCE after each deployment to a new URL.
 * Protected by admin session.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  const session = locals.session;
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const siteUrl = import.meta.env.PUBLIC_SITE_URL;
  if (!siteUrl || siteUrl.includes('localhost')) {
    return new Response(
      JSON.stringify({
        error: 'Cannot register Telegram webhook for localhost. Deploy to production first, then call this endpoint.',
        tip: 'For local testing, use `stripe listen` equivalent: ngrok http 4321, then manually call https://api.telegram.org/bot<TOKEN>/setWebhook',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const webhookUrl = `${siteUrl}/api/telegram/webhook`;

  try {
    await registerWebhook(webhookUrl);
    return new Response(
      JSON.stringify({ ok: true, webhook: webhookUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
