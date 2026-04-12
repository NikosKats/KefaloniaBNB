import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';

/**
 * POST /api/admin/listings/import/download-photos
 * Downloads photos from external CDN URLs and uploads to Supabase Storage.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { listingId } = body;
  if (!listingId) return json({ error: 'listingId is required' }, 400);

  const service = getServiceClient();

  // Verify listing exists and user has access
  const { data: listing } = await service
    .from('listings')
    .select('id,owner_id')
    .eq('id', listingId)
    .single();

  if (!listing) return json({ error: 'Listing not found' }, 404);

  // Property owners can only download photos for their own listings
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', locals.session.user.id)
    .single();

  if (profile?.role === 'property_owner' && listing.owner_id !== locals.session.user.id) {
    return json({ error: 'Forbidden' }, 403);
  }

  // Fetch listing_images that still have external URLs (no storage_key)
  const { data: images } = await service
    .from('listing_images')
    .select('id,url,sort_order')
    .eq('listing_id', listingId)
    .or('storage_key.eq.,storage_key.is.null')
    .order('sort_order');

  if (!images?.length) return json({ message: 'No external photos to download', downloaded: 0 }, 200);

  let downloaded = 0;
  const errors: string[] = [];

  for (const img of images) {
    try {
      const res = await fetch(img.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KefaloniaBNB/1.0)' },
      });
      if (!res.ok) {
        errors.push(`Failed to fetch ${img.url}: ${res.status}`);
        continue;
      }

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const buffer = await res.arrayBuffer();
      const storageKey = `${listingId}/${Date.now()}-${img.sort_order}.${ext}`;

      const { error: uploadErr } = await service.storage
        .from('listing-photos')
        .upload(storageKey, buffer, { contentType, upsert: true });

      if (uploadErr) {
        errors.push(`Upload failed for image ${img.id}: ${uploadErr.message}`);
        continue;
      }

      const { data: publicUrl } = service.storage.from('listing-photos').getPublicUrl(storageKey);

      await service
        .from('listing_images')
        .update({ storage_key: storageKey, url: publicUrl.publicUrl })
        .eq('id', img.id);

      downloaded++;
    } catch (err: any) {
      errors.push(`Error processing image ${img.id}: ${err.message}`);
    }
  }

  return json({ downloaded, total: images.length, errors: errors.length ? errors : undefined }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
