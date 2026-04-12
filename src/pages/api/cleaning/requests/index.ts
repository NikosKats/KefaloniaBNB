import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { CreateRequestSchema } from '../../../../lib/validators/cleaning.ts';
import { requireSession } from '../../../../lib/cleaning/permissions.ts';
import { notifyMany } from '../../../../lib/cleaning/notifications.ts';
import { sendNewCleaningRequestEmail } from '../../../../lib/email.ts';

export const GET: APIRoute = async ({ locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const service = getServiceClient();
  const userId = locals.session!.user.id;
  const { data: profileRow } = await service.from('profiles').select('role').eq('id', userId).single();
  const role = profileRow?.role ?? '';
  const isAdmin = role === 'admin' || role === 'super_admin';

  let query = service
    .from('cleaning_requests')
    .select('*, listings(title, city, bedrooms, property_type), cleaning_matches(id, cleaner_id, proposed_price, is_accepted)')
    .order('requested_date', { ascending: false });

  if (!isAdmin) {
    query = query.eq('owner_id', userId);
  }

  const { data, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  const parsed = CreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const service = getServiceClient();

  // locals.profile / ownerListingIds are only set for guarded routes — fetch explicitly
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const role = profile?.role ?? '';
  const isAdmin = role === 'admin' || role === 'super_admin';

  if (!isAdmin) {
    const { data: ownedListings } = await service
      .from('listings')
      .select('id')
      .eq('owner_id', userId);
    const ownerListingIds = (ownedListings ?? []).map((l: any) => l.id);
    if (!ownerListingIds.includes(parsed.data.listing_id)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
  }

  // Strip UI-only fields before DB insert
  const { save_as_template, template_name, checklist_items, ...requestData } = parsed.data;

  const { data, error } = await service
    .from('cleaning_requests')
    .insert({ ...requestData, checklist_items: checklist_items ?? [], owner_id: userId })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Save checklist as a reusable template if requested
  if (save_as_template && checklist_items && checklist_items.length > 0) {
    try {
      const { data: tpl } = await service
        .from('property_cleaning_checklist_templates')
        .insert({ owner_id: userId, listing_id: parsed.data.listing_id, name: template_name || 'My Template' })
        .select()
        .single();
      if (tpl) {
        await service
          .from('property_cleaning_checklist_template_items')
          .insert(checklist_items.map((label, i) => ({ template_id: tpl.id, label, sort_order: i })));
      }
    } catch (e) {
      console.error('Failed to save checklist template:', e);
    }
  }

  // Notify + email all active cleaners of the new request
  try {
    const [{ data: cleaners }, { data: listing }] = await Promise.all([
      service.from('cleaner_profiles').select('user_id'),
      service.from('listings').select('title, city, bedrooms, property_type').eq('id', parsed.data.listing_id).single(),
    ]);
    const cleanerUserIds = (cleaners ?? []).map((c: any) => c.user_id).filter((id: string) => id !== userId);
    if (cleanerUserIds.length > 0) {
      // In-app notifications
      await notifyMany(service, cleanerUserIds, 'new_request', { request_id: data.id, listing_id: parsed.data.listing_id });
      // Fetch cleaner emails and send email notifications
      if (listing) {
        const { data: profiles } = await service
          .from('profiles')
          .select('email, full_name')
          .in('id', cleanerUserIds);
        await Promise.allSettled(
          (profiles ?? [])
            .filter((p: any) => p.email)
            .map((p: any) =>
              sendNewCleaningRequestEmail(p.email, p.full_name ?? 'Cleaner', {
                id: data.id,
                requested_date: data.requested_date,
                earliest_time: data.earliest_time,
                latest_time: data.latest_time,
                notes: data.notes ?? null,
              }, listing)
            )
        );
      }
    }
  } catch (e) {
    console.error('Failed to notify/email cleaners of new request:', e);
  }

  return new Response(JSON.stringify(data), { status: 201 });
};
