import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

// DELETE /api/listings/images/:imageId — removes image from DB + storage
export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const { imageId } = params;
  const service = getServiceClient();

  // Fetch storage key before deleting
  const { data: img, error: fetchErr } = await service
    .from('listing_images')
    .select('storage_key, listing_id, is_cover')
    .eq('id', imageId)
    .single();

  if (fetchErr || !img) return new Response(JSON.stringify({ error: 'Image not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  // Delete from DB
  const { error: dbErr } = await service.from('listing_images').delete().eq('id', imageId);
  if (dbErr) return new Response(JSON.stringify({ error: dbErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  // Delete from storage (non-fatal)
  await service.storage.from('listing-images').remove([img.storage_key]).catch(console.error);

  // If deleted image was cover, promote the next image
  if (img.is_cover) {
    const { data: next } = await service
      .from('listing_images')
      .select('id')
      .eq('listing_id', img.listing_id)
      .order('sort_order')
      .limit(1)
      .single();
    if (next) {
      await service.from('listing_images').update({ is_cover: true }).eq('id', next.id);
    }
  }

  return new Response(null, { status: 204 });
};

// PATCH /api/listings/images/:imageId — set as cover image
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const { imageId } = params;
  const body = await request.json().catch(() => ({}));
  const service = getServiceClient();

  if (body.is_cover) {
    // Fetch listing_id
    const { data: img } = await service.from('listing_images').select('listing_id').eq('id', imageId).single();
    if (!img) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    // Unset all covers for this listing
    await service.from('listing_images').update({ is_cover: false }).eq('listing_id', img.listing_id);
    // Set this one as cover
    await service.from('listing_images').update({ is_cover: true }).eq('id', imageId);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
