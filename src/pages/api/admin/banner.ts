import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { requireSuperAdmin } from '../../../lib/cleaning/permissions.ts';

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET — fetch current active banner (public, no auth needed)
export const GET: APIRoute = async () => {
  const service = getServiceClient();
  const { data } = await service
    .from('site_banners')
    .select('*')
    .eq('is_active', true)
    .single();
  return json({ banner: data ?? null });
};

// POST — create or replace the active banner
export const POST: APIRoute = async ({ locals, request }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  const body = await request.json();
  const { message, type = 'info', link_text, link_url } = body;
  if (!message?.trim()) return json({ error: 'Message is required' }, 400);

  const service = getServiceClient();

  // Deactivate any existing active banner first
  await service.from('site_banners').update({ is_active: false }).eq('is_active', true);

  const { data, error } = await service
    .from('site_banners')
    .insert({ message: message.trim(), type, link_text: link_text || null, link_url: link_url || null, is_active: true })
    .select()
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, banner: data }, 201);
};

// PATCH — update active state or message of existing banner
export const PATCH: APIRoute = async ({ locals, request }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  const body = await request.json();
  const { id, is_active, message, type, link_text, link_url } = body;
  if (!id) return json({ error: 'id is required' }, 400);

  const service = getServiceClient();

  // If activating this banner, deactivate others first
  if (is_active === true) {
    await service.from('site_banners').update({ is_active: false }).neq('id', id);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (is_active !== undefined) updates.is_active = is_active;
  if (message !== undefined) updates.message = message;
  if (type !== undefined) updates.type = type;
  if (link_text !== undefined) updates.link_text = link_text || null;
  if (link_url !== undefined) updates.link_url = link_url || null;

  const { error } = await service.from('site_banners').update(updates).eq('id', id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
};

// DELETE — remove a banner
export const DELETE: APIRoute = async ({ locals, request }) => {
  const denied = requireSuperAdmin(locals);
  if (denied) return denied;

  const body = await request.json();
  if (!body.id) return json({ error: 'id is required' }, 400);

  const service = getServiceClient();
  const { error } = await service.from('site_banners').delete().eq('id', body.id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
};
