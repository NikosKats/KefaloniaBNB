import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';
import { parseICalFeed } from '../../../../lib/ical.ts';

/**
 * POST /api/admin/listings/ical-sync
 * Saves iCal URL and/or syncs blocked dates from external calendar.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { listingId, icalUrl } = body;
  if (!listingId) return json({ error: 'listingId is required' }, 400);

  const service = getServiceClient();

  // Verify listing exists and user has access
  const { data: listing } = await service
    .from('listings')
    .select('id,owner_id,ical_url')
    .eq('id', listingId)
    .single();

  if (!listing) return json({ error: 'Listing not found' }, 404);

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', locals.session.user.id)
    .single();

  if (profile?.role === 'property_owner' && listing.owner_id !== locals.session.user.id) {
    return json({ error: 'Forbidden' }, 403);
  }

  // Save iCal URL if provided
  const feedUrl = icalUrl || listing.ical_url;
  if (icalUrl) {
    await service.from('listings').update({ ical_url: icalUrl }).eq('id', listingId);
  }

  if (!feedUrl) return json({ error: 'No iCal URL configured' }, 400);

  // Fetch and parse the iCal feed
  let icalText: string;
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KefaloniaBNB/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icalText = await res.text();
  } catch (err: any) {
    return json({ error: `Failed to fetch iCal feed: ${err.message}` }, 500);
  }

  const events = parseICalFeed(icalText);
  if (!events.length) return json({ message: 'No events found in feed', added: 0, removed: 0 }, 200);

  // Get existing iCal-sourced blocked dates for this listing
  const { data: existing } = await service
    .from('blocked_dates')
    .select('id,external_uid,start_date,end_date')
    .eq('listing_id', listingId)
    .in('source', ['ical', 'airbnb', 'booking_com']);

  const existingByUid = new Map((existing ?? []).map(e => [e.external_uid, e]));
  const incomingUids = new Set(events.map(e => e.uid));

  // Determine source type from URL
  let source: 'ical' | 'airbnb' | 'booking_com' = 'ical';
  if (feedUrl.includes('airbnb.com')) source = 'airbnb';
  else if (feedUrl.includes('booking.com')) source = 'booking_com';

  // Add new events
  let added = 0;
  for (const event of events) {
    if (!existingByUid.has(event.uid)) {
      const { error } = await service.from('blocked_dates').insert({
        listing_id: listingId,
        start_date: event.start,
        end_date: event.end,
        reason: event.summary || 'External booking',
        source,
        external_uid: event.uid,
      });
      if (!error) added++;
    }
  }

  // Remove events no longer in feed
  let removed = 0;
  for (const [uid, block] of existingByUid) {
    if (uid && !incomingUids.has(uid)) {
      await service.from('blocked_dates').delete().eq('id', block.id);
      removed++;
    }
  }

  // Update ical_last_synced timestamp
  await service.from('listings').update({ ical_last_synced: new Date().toISOString() }).eq('id', listingId);

  return json({ added, removed, total: events.length }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
