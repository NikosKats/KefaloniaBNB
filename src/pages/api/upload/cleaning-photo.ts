import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: 'file is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Accept image/* broadly — HEIC from iPhones
  const mime = file.type || 'image/jpeg';
  if (!ALLOWED_TYPES.includes(mime) && !mime.startsWith('image/')) {
    return new Response(JSON.stringify({ error: 'Invalid file type. Please upload an image.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large. Maximum 10 MB.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const service = getServiceClient();
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const storageKey = `cleaning/${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadErr } = await service.storage
    .from('listing-images')
    .upload(storageKey, buffer, { contentType: mime, upsert: false });

  if (uploadErr) {
    return new Response(JSON.stringify({ error: 'Upload failed: ' + uploadErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: { publicUrl } } = service.storage.from('listing-images').getPublicUrl(storageKey);

  return new Response(JSON.stringify({ url: publicUrl }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
