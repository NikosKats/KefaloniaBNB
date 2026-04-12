import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const listingId = formData.get('listing_id') as string | null;
  const isCover = formData.get('is_cover') === 'true';
  const altText = formData.get('alt_text') as string | null;

  if (!file || !listingId) return new Response(JSON.stringify({ error: 'file and listing_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!ALLOWED_TYPES.includes(file.type)) return new Response(JSON.stringify({ error: 'Invalid file type. Use JPEG, PNG, WebP, or AVIF.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (file.size > MAX_SIZE) return new Response(JSON.stringify({ error: 'File too large. Maximum 5MB.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const service = getServiceClient();
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const storageKey = `listings/${listingId}/${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadErr } = await service.storage
    .from('listing-images')
    .upload(storageKey, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return new Response(JSON.stringify({ error: 'Upload failed: ' + uploadErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const { data: { publicUrl } } = service.storage.from('listing-images').getPublicUrl(storageKey);

  // Get current max sort order
  const { data: existing } = await service.from('listing_images').select('sort_order').eq('listing_id', listingId).order('sort_order', { ascending: false }).limit(1);
  const sortOrder = ((existing?.[0]?.sort_order ?? -1) + 1);

  // If is_cover, unset existing cover
  if (isCover) {
    await service.from('listing_images').update({ is_cover: false }).eq('listing_id', listingId);
  }

  const { data: image, error: dbErr } = await service.from('listing_images').insert({
    listing_id: listingId,
    storage_key: storageKey,
    url: publicUrl,
    alt_text: altText,
    sort_order: sortOrder,
    is_cover: isCover || sortOrder === 0,
  }).select().single();

  if (dbErr) return new Response(JSON.stringify({ error: 'DB insert failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify({ image }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
