import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase';

const J = { 'Content-Type': 'application/json' };
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

// POST — create coupon (admin)
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const { business_id, code, description, discount_type, discount_value, valid_until } = await request.json();
  if (!business_id || !code || !description || !discount_type || !discount_value)
    return err('business_id, code, description, discount_type, discount_value required');

  const service = getServiceClient();
  const { data, error } = await service.from('partner_coupons').insert({
    business_id,
    code: code.trim().toUpperCase(),
    description: description.trim(),
    discount_type,
    discount_value: parseFloat(discount_value),
    valid_until: valid_until || null,
    is_active: true,
  }).select().single();

  if (error) return err(error.message, 500);
  return new Response(JSON.stringify({ coupon: data }), { status: 201, headers: J });
};

// PATCH — toggle active (admin)
export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const { id, is_active } = await request.json();
  if (!id) return err('id required');
  const service = getServiceClient();
  const { error } = await service.from('partner_coupons').update({ is_active }).eq('id', id);
  if (error) return err(error.message, 500);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};

// DELETE — remove coupon (admin)
export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const { id } = await request.json();
  if (!id) return err('id required');
  const service = getServiceClient();
  const { error } = await service.from('partner_coupons').delete().eq('id', id);
  if (error) return err(error.message, 500);
  return new Response(null, { status: 204 });
};

// PUT — public: guest marks "I used this coupon"
export const PUT: APIRoute = async ({ request }) => {
  const { coupon_id, business_id, source } = await request.json();
  if (!coupon_id || !business_id) return err('coupon_id and business_id required');

  const service = getServiceClient();
  await Promise.all([
    service.from('partner_coupon_redemptions').insert({ coupon_id, business_id, source: source || null }),
    service.rpc('increment_coupon_redemption', { coupon_id }),
  ]);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};
