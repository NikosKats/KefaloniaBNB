import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const restaurantId = formData.get('restaurant_id') as string | null;
  const isCover = formData.get('is_cover') === 'true';

  if (!file || !restaurantId) return new Response(JSON.stringify({ error: 'file and restaurant_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!ALLOWED_TYPES.includes(file.type)) return new Response(JSON.stringify({ error: 'Invalid file type. Use JPEG, PNG, WebP, or AVIF.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (file.size > MAX_SIZE) return new Response(JSON.stringify({ error: 'File too large. Maximum 5MB.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const service = getServiceClient();
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const storageKey = `restaurants/${restaurantId}/${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadErr } = await service.storage
    .from('listing-images')
    .upload(storageKey, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return new Response(JSON.stringify({ error: 'Upload failed: ' + uploadErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const { data: { publicUrl } } = service.storage.from('listing-images').getPublicUrl(storageKey);

  // Update restaurant: set as cover or append to photo_urls
  const { data: restaurant } = await service.from('restaurants').select('cover_photo, photo_urls').eq('id', restaurantId).single();
  if (!restaurant) return new Response(JSON.stringify({ error: 'Restaurant not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const updates: Record<string, unknown> = {};
  if (isCover || !restaurant.cover_photo) {
    updates.cover_photo = publicUrl;
  }
  if (!isCover) {
    const existing = Array.isArray(restaurant.photo_urls) ? restaurant.photo_urls : [];
    updates.photo_urls = [...existing, publicUrl];
  }
  updates.updated_at = new Date().toISOString();

  await service.from('restaurants').update(updates).eq('id', restaurantId);

  return new Response(JSON.stringify({ url: publicUrl, is_cover: !!updates.cover_photo }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
