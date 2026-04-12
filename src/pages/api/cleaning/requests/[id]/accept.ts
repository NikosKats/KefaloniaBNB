import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireSession } from '../../../../../lib/cleaning/permissions.ts';
import { notify } from '../../../../../lib/cleaning/notifications.ts';
import { computeFees } from '../../../../../lib/types/cleaning.ts';
import { seedDefaultChecklist } from '../../../../../lib/cleaning/checklist.ts';
import { sendCleanerJobAssigned } from '../../../../../lib/email.ts';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  if (!body?.match_id) {
    return new Response(JSON.stringify({ error: 'match_id required' }), { status: 400 });
  }

  const service = getServiceClient();

  // Check role — admins can accept on behalf of the owner
  const { data: profileRow } = await service.from('profiles').select('role').eq('id', userId).single();
  const role = profileRow?.role ?? '';
  const isAdmin = role === 'admin' || role === 'super_admin';

  // Get request + match
  const { data: req } = await service
    .from('cleaning_requests')
    .select('*')
    .eq('id', params.id!)
    .single();

  if (!req) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  if (req.owner_id !== userId && !isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  if (req.status !== 'open') return new Response(JSON.stringify({ error: 'Request already matched' }), { status: 409 });

  const { data: match } = await service
    .from('cleaning_matches')
    .select('*')
    .eq('id', body.match_id)
    .eq('request_id', params.id!)
    .single();

  if (!match) return new Response(JSON.stringify({ error: 'Bid not found' }), { status: 404 });

  const { platformFee, cleanerPayout } = computeFees(match.proposed_price);

  // Look up the cleaning fee charged to the guest (if this request was linked to a booking)
  let cleaningFeeCollected: number | null = null;
  if (req.booking_id) {
    const { data: bookingListing } = await service
      .from('bookings')
      .select('listings(cleaning_fee)')
      .eq('id', req.booking_id)
      .single();
    const fee = (bookingListing as any)?.listings?.cleaning_fee;
    if (fee != null) cleaningFeeCollected = parseFloat(fee);
  }

  // Create the job
  const { data: job, error: jobErr } = await service
    .from('cleaning_jobs')
    .insert({
      match_id: match.id,
      request_id: req.id,
      cleaner_id: match.cleaner_id,
      listing_id: req.listing_id,
      owner_id: req.owner_id,
      booking_id: req.booking_id ?? null,
      scheduled_date: req.requested_date,
      scheduled_time: match.proposed_time ?? req.earliest_time,
      agreed_price: match.proposed_price,
      platform_fee: platformFee,
      cleaner_payout: cleanerPayout,
      cleaning_fee_collected: cleaningFeeCollected,
      status: 'scheduled',
    })
    .select()
    .single();

  if (jobErr) return new Response(JSON.stringify({ error: jobErr.message }), { status: 500 });

  // Mark match accepted, others rejected
  await service.from('cleaning_matches').update({ is_accepted: true }).eq('id', match.id);
  await service.from('cleaning_matches').update({ is_accepted: false })
    .eq('request_id', params.id!).neq('id', match.id);

  // Update request status
  await service.from('cleaning_requests').update({ status: 'confirmed' }).eq('id', params.id!);

  // Seed checklist
  await seedDefaultChecklist(service, job.id);

  // Notifications
  const { data: cleanerProfile } = await service
    .from('cleaner_profiles')
    .select('user_id')
    .eq('id', match.cleaner_id)
    .single();

  if (cleanerProfile) {
    await notify(service, cleanerProfile.user_id, 'bid_accepted', { job_id: job.id });

    // Send job assignment email with property details
    const [{ data: cleanerPublicProfile }, { data: listing }] = await Promise.all([
      service.from('profiles').select('full_name, email').eq('id', cleanerProfile.user_id).single(),
      service.from('listings').select('title, address, city, latitude, longitude, checkin_instructions').eq('id', req.listing_id).single(),
    ]);

    if (cleanerPublicProfile?.email && listing) {
      try {
        await sendCleanerJobAssigned(
          cleanerPublicProfile.email,
          cleanerPublicProfile.full_name ?? 'Cleaner',
          job,
          listing,
        );
      } catch (e) {
        console.error('Failed to send cleaner job email:', e);
      }
    }
  }

  return new Response(JSON.stringify({ job }), { status: 201 });
};
