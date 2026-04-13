import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

const J = { 'Content-Type': 'application/json' };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/**
 * POST /api/admin/marketing/campaigns
 * Create a marketing campaign. ref_code is auto-derived from name + suffix.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const role = (locals.profile as any)?.role;
  if (!['admin', 'super_admin'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: J });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: J });
  }

  const {
    name,
    channel,
    target_url,
    description,
    flyer_headline,
    flyer_subhead,
    flyer_offer,
    flyer_listing_id,
    utm_source,
    utm_medium,
    utm_campaign,
  } = body;

  if (!name?.trim() || !channel || !target_url?.trim()) {
    return new Response(JSON.stringify({ error: 'name, channel, target_url required' }), { status: 400, headers: J });
  }

  const validChannels = ['flyer', 'qr', 'social', 'email', 'print', 'partner', 'other'];
  if (!validChannels.includes(channel)) {
    return new Response(JSON.stringify({ error: 'Invalid channel' }), { status: 400, headers: J });
  }

  const service = getServiceClient();
  const userId = locals.session?.user?.id ?? null;

  // Build a unique ref_code: <slug>-<6-char suffix>.
  let ref_code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 8);
    const candidate = `${slugify(name)}-${suffix}`;
    const { data: existing } = await service
      .from('marketing_campaigns')
      .select('id')
      .eq('ref_code', candidate)
      .maybeSingle();
    if (!existing) { ref_code = candidate; break; }
  }
  if (!ref_code) {
    return new Response(JSON.stringify({ error: 'Could not generate unique ref code' }), { status: 500, headers: J });
  }

  const { data, error } = await service
    .from('marketing_campaigns')
    .insert({
      name: name.trim(),
      ref_code,
      channel,
      target_url: target_url.trim(),
      description: description?.trim() || null,
      flyer_headline: flyer_headline?.trim() || null,
      flyer_subhead: flyer_subhead?.trim() || null,
      flyer_offer: flyer_offer?.trim() || null,
      flyer_listing_id: flyer_listing_id || null,
      utm_source: utm_source?.trim() || null,
      utm_medium: utm_medium?.trim() || null,
      utm_campaign: utm_campaign?.trim() || ref_code,
      created_by: userId,
    })
    .select('id, ref_code')
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message || 'Insert failed' }), { status: 500, headers: J });
  }

  return new Response(JSON.stringify({ ok: true, id: data.id, ref_code: data.ref_code }), { status: 201, headers: J });
};

/**
 * PATCH /api/admin/marketing/campaigns?id=...   { is_active }
 * DELETE /api/admin/marketing/campaigns?id=...
 */
export const PATCH: APIRoute = async ({ url, request, locals }) => {
  const role = (locals.profile as any)?.role;
  if (!['admin', 'super_admin'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: J });
  }
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: J });
  const body = await request.json().catch(() => ({}));
  const updates: Record<string, any> = {};
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers: J });
  }
  const service = getServiceClient();
  const { error } = await service.from('marketing_campaigns').update(updates).eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: J });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  const role = (locals.profile as any)?.role;
  if (!['admin', 'super_admin'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: J });
  }
  const id = url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: J });
  const service = getServiceClient();
  const { error } = await service.from('marketing_campaigns').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: J });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};
