import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const fd = await request.formData();
  const id   = (fd.get('id')   as string)?.trim();
  const days = parseInt((fd.get('days') as string) ?? '0');

  if (!id || !days || days <= 0) return redirect('/admin/featured?msg=error');

  const service = getServiceClient();
  const { data: row, error: fetchErr } = await service
    .from('featured_listings')
    .select('expires_at')
    .eq('id', id)
    .single();

  if (fetchErr || !row) return redirect('/admin/featured?msg=error');

  const current = new Date(row.expires_at);
  // If already expired, extend from now instead of a past date
  const base = current < new Date() ? new Date() : current;
  base.setDate(base.getDate() + days);

  const { error } = await service
    .from('featured_listings')
    .update({ expires_at: base.toISOString(), is_active: true })
    .eq('id', id);

  if (error) return redirect('/admin/featured?msg=error');
  return redirect('/admin/featured?msg=extended');
};
