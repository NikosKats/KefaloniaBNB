import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const fd           = await request.formData();
  const id           = fd.get('id') as string | null;
  const title        = fd.get('title') as string;
  const slug         = (fd.get('slug') as string).toLowerCase().trim();
  const meta_title   = fd.get('meta_title') as string || null;
  const meta_description = fd.get('meta_description') as string || null;
  const body         = fd.get('body') as string;
  const is_published = fd.get('is_published') === 'true';

  const service = getServiceClient();

  if (id) {
    await service.from('cms_pages').update({
      title, slug, meta_title, meta_description, body, is_published,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
  } else {
    await service.from('cms_pages').insert({
      title, slug, meta_title, meta_description, body, is_published,
    });
  }

  return redirect('/admin/content?msg=saved');
};
