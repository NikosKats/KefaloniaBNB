import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

const J = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ref_code, landing_page } = await request.json();
    if (!ref_code) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: J });

    const service = getServiceClient();
    await service.from('referral_clicks').insert({ ref_code, landing_page: landing_page ?? null });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: J });
  }
};
