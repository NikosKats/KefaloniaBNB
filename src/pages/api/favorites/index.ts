import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { awardPoints } from '../../../lib/points.ts';

// POST: toggle favorite on a listing
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const { listing_id } = await request.json();
  if (!listing_id) return json({ error: 'listing_id required' }, 400);

  const service = getServiceClient();
  const userId = locals.session.user.id;

  const { data: existing } = await service
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listing_id)
    .maybeSingle();

  if (existing) {
    await service.from('favorites').delete().eq('id', existing.id);
    return json({ favorited: false }, 200);
  } else {
    await service.from('favorites').insert({ user_id: userId, listing_id });
    // Gamification: one-shot bonus for the user's first favorite.
    // Unique index swallows duplicates, so this is safe to always call.
    awardPoints(userId, 'first_favorite', { refId: listing_id }).catch(() => {/* ignore */});
    return json({ favorited: true }, 200);
  }
};

// GET: list user's favorited listing IDs (or full listings with ?full=1)
export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  const service = getServiceClient();
  const userId = locals.session.user.id;
  const full = url.searchParams.get('full') === '1';

  if (full) {
    const { data } = await service
      .from('favorites')
      .select('id, listing_id, created_at, listings(id, slug, title, city, country, base_price, bedrooms, max_guests, listing_images(url, is_cover, alt_text, sort_order))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return json({ favorites: data ?? [] }, 200);
  }

  const { data } = await service
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId);
  return json({ listing_ids: (data ?? []).map((f: any) => f.listing_id) }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
