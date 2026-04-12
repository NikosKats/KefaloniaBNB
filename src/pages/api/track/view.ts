import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

/**
 * POST /api/track/view
 * Lightweight listing page view tracker.
 * Body: { listing_id, referrer?, session_id? }
 *
 * Returns 204 on success. Fire-and-forget from the client.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { listing_id, referrer, session_id } = body;

    if (!listing_id || typeof listing_id !== 'string') {
      return new Response(null, { status: 400 });
    }

    const service = getServiceClient();

    // Extract country from CF header if available (Cloudflare Workers)
    const country = request.headers.get('cf-ipcountry') ?? null;

    await service.from('listing_views').insert({
      listing_id,
      referrer: referrer?.slice(0, 500) ?? null,
      country,
      session_id: session_id?.slice(0, 100) ?? null,
    });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 500 });
  }
};
