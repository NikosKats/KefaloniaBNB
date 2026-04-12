import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../lib/cleaning/permissions.ts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const fd = await request.formData();
  const code          = (fd.get('code') as string)?.toUpperCase().trim();
  const discount_type = fd.get('discount_type') as string;
  const discount_value = parseFloat(fd.get('discount_value') as string);
  const max_uses      = fd.get('max_uses') ? parseInt(fd.get('max_uses') as string) : null;
  const valid_from    = fd.get('valid_from') || null;
  const valid_until   = fd.get('valid_until') || null;

  if (!code || !discount_type || isNaN(discount_value)) {
    return redirect('/admin/coupons?msg=error');
  }

  const service = getServiceClient();
  await service.from('coupons').insert({
    code, discount_type, discount_value, max_uses, valid_from, valid_until,
    is_active: true, used_count: 0,
  });

  return redirect('/admin/coupons?msg=created');
};
