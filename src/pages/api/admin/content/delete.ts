import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const fd = await request.formData();
  const id = fd.get('id') as string;

  const service = getServiceClient();
  await service.from('cms_pages').delete().eq('id', id);

  return redirect('/admin/content?msg=deleted');
};
