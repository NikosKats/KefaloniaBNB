import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

const J = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ locals, request }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const body = await request.json();
  const { id, slug, title, excerpt, content, cover_image, author, is_published, tags, meta_title, meta_description } = body;

  if (!slug || !title) {
    return new Response(JSON.stringify({ error: 'slug and title are required' }), { status: 400, headers: J });
  }

  const service = getServiceClient();
  const payload = {
    slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    title, excerpt: excerpt || null, content: content || null,
    cover_image: cover_image || null, author: author || 'KefaloniaBNB',
    is_published: !!is_published,
    published_at: is_published ? new Date().toISOString() : null,
    tags: Array.isArray(tags) ? tags : [],
    meta_title: meta_title || null,
    meta_description: meta_description || null,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (id) {
    result = await service.from('blog_posts').update(payload).eq('id', id).select('id').single();
  } else {
    result = await service.from('blog_posts').insert(payload).select('id').single();
  }

  if (result.error) {
    return new Response(JSON.stringify({ error: result.error.message }), { status: 500, headers: J });
  }
  return new Response(JSON.stringify({ ok: true, id: result.data.id }), { status: 200, headers: J });
};
