import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase';

const J = { 'Content-Type': 'application/json' };
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

// POST — business confirms they honored the coupon (scanned the QR)
export const POST: APIRoute = async ({ request }) => {
  const { token } = await request.json();
  if (!token) return err('token required');

  const service = getServiceClient();

  const { data: reveal } = await service
    .from('partner_coupon_reveals')
    .select('id, coupon_id, confirmed_at')
    .eq('token', token)
    .single();

  if (!reveal) return err('Invalid or expired token', 404);

  // Idempotent — already confirmed is fine
  if (reveal.confirmed_at) {
    return new Response(JSON.stringify({ ok: true, already_confirmed: true }), { status: 200, headers: J });
  }

  // Mark as confirmed and increment the billable redemption count
  await Promise.all([
    service
      .from('partner_coupon_reveals')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('token', token),
    service.rpc('increment_coupon_redemption', { coupon_id: reveal.coupon_id }),
  ]);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};
