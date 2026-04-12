import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { SubmitBidSchema } from '../../../../../lib/validators/cleaning.ts';
import { requireSession } from '../../../../../lib/cleaning/permissions.ts';
import { notify } from '../../../../../lib/cleaning/notifications.ts';
import { sendBidReceivedEmail } from '../../../../../lib/email.ts';

export const GET: APIRoute = async ({ params, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const service = getServiceClient();
  const { data, error } = await service
    .from('cleaning_matches')
    .select('*, cleaner_profiles(id, rating, review_count, bio)')
    .eq('request_id', params.id!);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  const parsed = SubmitBidSchema.safeParse({ ...body, request_id: params.id });
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const service = getServiceClient();

  // Get cleaner profile
  const { data: cleaner } = await service
    .from('cleaner_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!cleaner) {
    return new Response(JSON.stringify({ error: 'You must have a cleaner profile to bid' }), { status: 403 });
  }

  // Check request is open
  const { data: req } = await service
    .from('cleaning_requests')
    .select('id, status, owner_id')
    .eq('id', params.id!)
    .single();

  if (!req || req.status !== 'open') {
    return new Response(JSON.stringify({ error: 'Request is not open for bids' }), { status: 409 });
  }

  const { data, error } = await service
    .from('cleaning_matches')
    .insert({
      request_id: params.id!,
      cleaner_id: cleaner.id,
      proposed_price: parsed.data.proposed_price,
      proposed_time: parsed.data.proposed_time ?? null,
      message: parsed.data.message ?? null,
    })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Notify owner (in-app)
  await notify(service, req.owner_id, 'bid_received', { request_id: req.id, match_id: data.id });

  // Email owner
  try {
    const [{ data: ownerProfile }, { data: listing }] = await Promise.all([
      service.from('profiles').select('full_name, email').eq('id', req.owner_id).single(),
      service.from('listings').select('title, city').eq('id', req.listing_id).single(),
    ]);
    if (ownerProfile?.email && listing) {
      await sendBidReceivedEmail(
        ownerProfile.email,
        ownerProfile.full_name ?? 'Owner',
        { proposed_price: parsed.data.proposed_price, proposed_time: parsed.data.proposed_time ?? null, message: parsed.data.message ?? null },
        { id: req.id, requested_date: req.requested_date, earliest_time: req.earliest_time, latest_time: req.latest_time },
        listing,
      );
    }
  } catch (e) {
    console.error('Failed to send bid email to owner:', e);
  }

  return new Response(JSON.stringify(data), { status: 201 });
};
