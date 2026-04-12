import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireSession } from '../../../../../lib/cleaning/permissions.ts';
import { createCleaningCheckout } from '../../../../../lib/cleaning/payouts.ts';

export const POST: APIRoute = async ({ params, locals, request }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const service = getServiceClient();

  const { data: job } = await service
    .from('cleaning_jobs')
    .select('*, listings(title)')
    .eq('id', params.id!)
    .single();

  if (!job) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  if (job.owner_id !== userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  if (!['scheduled', 'completed'].includes(job.status)) {
    return new Response(JSON.stringify({ error: `Cannot pay for a job with status "${job.status}"` }), { status: 409 });
  }

  // Check for existing payment
  const { data: existing } = await service
    .from('cleaning_payments')
    .select('id, status')
    .eq('job_id', params.id!)
    .single();

  if (existing?.status === 'paid') {
    return new Response(JSON.stringify({ error: 'Already paid' }), { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const origin = (locals as any).url?.origin ?? 'https://kefaloniabnb.com';
  // When approving a completed job, use ?approved=1 so the page shows the right banner
  const successParam = job.status === 'completed' ? 'approved=1' : 'paid=1';
  const successUrl = body.success_url ?? `${origin}/owner/cleaning/jobs/${params.id}?${successParam}`;
  const cancelUrl = body.cancel_url ?? `${origin}/owner/cleaning/jobs/${params.id}`;

  const session = await createCleaningCheckout({
    jobId: params.id!,
    agreedPrice: job.agreed_price,
    listingTitle: (job as any).listings?.title ?? 'Property',
    scheduledDate: job.scheduled_date,
    ownerEmail: locals.session!.user.email ?? '',
    successUrl,
    cancelUrl,
  });

  // Upsert payment record
  if (existing) {
    await service.from('cleaning_payments').update({
      stripe_checkout_session: session.id,
      status: 'pending',
    }).eq('id', existing.id);
  } else {
    await service.from('cleaning_payments').insert({
      job_id: params.id!,
      stripe_checkout_session: session.id,
      amount: job.agreed_price,
      currency: 'eur',
      status: 'pending',
    });
  }

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
};
