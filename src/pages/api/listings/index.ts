import type { APIRoute } from 'astro';
import { ListingSchema } from '../../../lib/validators.ts';
import { getServiceClient } from '../../../lib/supabase.ts';
import { sendSimpleAlert } from '../../../lib/telegram.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { amenity_ids, ...rest } = body;
  const parsed = ListingSchema.safeParse(rest);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const service = getServiceClient();

  // locals.profile is only populated for guarded routes — fetch it explicitly here
  const { data: profile } = await service
    .from('profiles')
    .select('role, commission_rate')
    .eq('id', locals.session.user.id)
    .single();

  const insertData: Record<string, any> = { ...parsed.data };

  if (profile?.role === 'property_owner') {
    // Owner-created listings: auto-assign owner, require admin activation,
    // and default commission_rate from their profile (set at invite time)
    insertData.owner_id = locals.session.user.id;
    insertData.is_active = false;
    insertData.instant_booking = false;
    insertData.offer_full_payment = insertData.offer_full_payment ?? false;
    insertData.deposit_percent = insertData.deposit_percent ?? 0;
    insertData.allow_telegram_direct = insertData.allow_telegram_direct ?? true;
    if (insertData.commission_rate === undefined || insertData.commission_rate === null) {
      if (profile.commission_rate !== null && profile.commission_rate !== undefined) {
        insertData.commission_rate = profile.commission_rate;
      }
    }
  } else {
    // Admin-created listings: apply same safe defaults unless explicitly set
    insertData.is_active = insertData.is_active ?? false;
    insertData.instant_booking = insertData.instant_booking ?? false;
    insertData.offer_full_payment = insertData.offer_full_payment ?? false;
    insertData.deposit_percent = insertData.deposit_percent ?? 0;
    insertData.allow_telegram_direct = insertData.allow_telegram_direct ?? true;
  }

  const { data: listing, error } = await service.from('listings').insert(insertData).select().single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  // Sync amenities
  if (amenity_ids?.length) {
    await service.from('listing_amenities').insert(amenity_ids.map((aid: string) => ({ listing_id: listing.id, amenity_id: aid })));
  }

  await service.from('audit_logs').insert({ actor_id: locals.session.user.id, action: 'listing.created', entity_type: 'listings', entity_id: listing.id });

  // Notify super admin via Telegram when an owner submits a new listing for review
  if (profile?.role === 'property_owner') {
    const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
    const ownerName = (await service.from('profiles').select('full_name,email').eq('id', locals.session.user.id).single()).data;
    const ownerLabel = ownerName?.full_name ?? ownerName?.email ?? 'An owner';
    try {
      await sendSimpleAlert(
        `🏡 <b>New Listing Submitted for Review</b>\n\n<b>${listing.title}</b>\nSubmitted by: <b>${ownerLabel}</b>\n\n<a href="${siteUrl}/admin/listings/${listing.id}">Review listing →</a>`,
        'notify_booking_new',
        import.meta.env.TELEGRAM_CHAT_ID ?? '',
      );
    } catch { /* non-fatal */ }
  }

  return new Response(JSON.stringify({ listing }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
