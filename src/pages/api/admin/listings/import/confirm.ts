import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';

/**
 * POST /api/admin/listings/import/confirm
 * Creates a draft listing from scraped data + user overrides.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { scraped, overrides } = body;
  if (!scraped?.source || !scraped?.sourceUrl) return json({ error: 'Missing scraped data' }, 400);

  const service = getServiceClient();

  // Fetch profile for owner assignment
  const { data: profile } = await service
    .from('profiles')
    .select('role, commission_rate')
    .eq('id', locals.session.user.id)
    .single();

  // Generate slug from title
  const title = overrides?.title || scraped.title || 'Imported Listing';
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  // Map property type to our enum
  const validTypes = ['villa', 'cottage', 'apartment', 'house', 'studio'];
  let propertyType = (overrides?.property_type || scraped.propertyType || '').toLowerCase();
  if (!validTypes.includes(propertyType)) {
    // Best-effort mapping
    if (propertyType.includes('villa')) propertyType = 'villa';
    else if (propertyType.includes('apartment') || propertyType.includes('flat')) propertyType = 'apartment';
    else if (propertyType.includes('studio')) propertyType = 'studio';
    else if (propertyType.includes('cottage') || propertyType.includes('cabin')) propertyType = 'cottage';
    else propertyType = 'house';
  }

  const insertData: Record<string, any> = {
    slug,
    title,
    description: overrides?.description || scraped.description || '',
    property_type: propertyType,
    address: overrides?.address || scraped.location?.address || '',
    city: overrides?.city || scraped.location?.city || '',
    region: overrides?.region || 'Kefalonia',
    country: 'Greece',
    latitude: overrides?.latitude ?? scraped.location?.lat ?? null,
    longitude: overrides?.longitude ?? scraped.location?.lng ?? null,
    max_guests: overrides?.max_guests || scraped.maxGuests || 4,
    bedrooms: overrides?.bedrooms ?? scraped.bedrooms ?? 1,
    beds: overrides?.beds ?? scraped.bedrooms ?? 1,
    bathrooms: overrides?.bathrooms ?? scraped.bathrooms ?? 1,
    base_price: overrides?.base_price || 50,
    cleaning_fee: overrides?.cleaning_fee ?? 0,
    extra_guest_fee: 0,
    extra_guest_after: 2,
    min_nights: overrides?.min_nights || 1,
    check_in_time: '15:00',
    check_out_time: '11:00',
    cancellation_policy: 'moderate',
    is_active: false,
    instant_booking: false,
    import_source: scraped.source,
    import_source_url: scraped.sourceUrl,
  };

  // Owner assignment
  if (profile?.role === 'property_owner') {
    insertData.owner_id = locals.session.user.id;
    if (profile.commission_rate != null) {
      insertData.commission_rate = profile.commission_rate;
    }
  } else if (overrides?.owner_id) {
    insertData.owner_id = overrides.owner_id;
  }

  const { data: listing, error } = await service
    .from('listings')
    .insert(insertData)
    .select('id,slug')
    .single();

  if (error) return json({ error: error.message }, 500);

  // Insert photo records (CDN URLs from source platform)
  if (scraped.photos?.length) {
    const photoInserts = scraped.photos.slice(0, 30).map((url: string, i: number) => ({
      listing_id: listing.id,
      url,
      storage_key: '', // Will be filled when photos are downloaded
      sort_order: i,
      is_cover: i === 0,
    }));
    await service.from('listing_images').insert(photoInserts);
  }

  // Match amenities by name
  if (scraped.amenities?.length) {
    const { data: allAmenities } = await service.from('amenities').select('id,label');
    if (allAmenities?.length) {
      const scrapedLower = scraped.amenities.map((a: string) => a.toLowerCase());
      const matched = allAmenities.filter((a: any) =>
        scrapedLower.some((s: string) => s.includes(a.label.toLowerCase()) || a.label.toLowerCase().includes(s))
      );
      if (matched.length) {
        await service.from('listing_amenities').insert(
          matched.map((a: any) => ({ listing_id: listing.id, amenity_id: a.id }))
        );
      }
    }
  }

  await service.from('audit_logs').insert({
    actor_id: locals.session.user.id,
    action: 'listing.imported',
    entity_type: 'listings',
    entity_id: listing.id,
  });

  return json({ listing }, 201);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
