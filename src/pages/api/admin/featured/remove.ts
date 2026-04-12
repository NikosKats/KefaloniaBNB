import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const fd = await request.formData();
  const id = (fd.get('id') as string)?.trim();

  if (!id) return redirect('/admin/featured?msg=error');

  const service = getServiceClient();
  const { error } = await service
    .from('featured_listings')
    .delete()
    .eq('id', id);

  if (error) return redirect('/admin/featured?msg=error');
  return redirect('/admin/featured?msg=removed');
};
