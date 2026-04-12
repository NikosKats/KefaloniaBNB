import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const fd = await request.formData();
  const listing_id = (fd.get('listing_id') as string)?.trim();
  const owner_id   = (fd.get('owner_id')   as string)?.trim() || null;
  const days       = parseInt((fd.get('days') as string) ?? '0');
  const starts_at  = (fd.get('starts_at')  as string)?.trim() || new Date().toISOString();

  if (!listing_id || !days || days <= 0) return redirect('/admin/featured?msg=error');

  const starts = new Date(starts_at);
  const expires = new Date(starts);
  expires.setDate(expires.getDate() + days);

  const service = getServiceClient();
  const { error } = await service.from('featured_listings').insert({
    listing_id,
    owner_id,
    starts_at: starts.toISOString(),
    expires_at: expires.toISOString(),
    is_active: true,
  });

  if (error) return redirect('/admin/featured?msg=error');
  return redirect('/admin/featured?msg=added');
};
