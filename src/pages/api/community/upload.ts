import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Please log in to upload' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!ALLOWED_TYPES.includes(file.type)) return new Response(JSON.stringify({ error: 'Invalid file type. Use JPEG, PNG, WebP, or AVIF.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (file.size > MAX_SIZE) return new Response(JSON.stringify({ error: 'File too large. Maximum 5MB.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const service = getServiceClient();
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const userId = locals.session.user.id;
  const storageKey = `community/${userId}/${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadErr } = await service.storage
    .from('listing-images')
    .upload(storageKey, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return new Response(JSON.stringify({ error: 'Upload failed: ' + uploadErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const { data: { publicUrl } } = service.storage.from('listing-images').getPublicUrl(storageKey);

  return new Response(JSON.stringify({ url: publicUrl }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
