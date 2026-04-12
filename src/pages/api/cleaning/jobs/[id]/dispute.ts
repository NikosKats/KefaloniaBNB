import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireSession } from '../../../../../lib/cleaning/permissions.ts';
import { RaiseDisputeSchema } from '../../../../../lib/validators/cleaning.ts';
import { notify } from '../../../../../lib/cleaning/notifications.ts';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  const parsed = RaiseDisputeSchema.safeParse({ ...body, job_id: params.id });
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const service = getServiceClient();
  const { data: job } = await service
    .from('cleaning_jobs')
    .select('*, cleaner_profiles(user_id)')
    .eq('id', params.id!)
    .single();

  if (!job) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  if (job.status !== 'completed') {
    return new Response(JSON.stringify({ error: 'Can only dispute completed jobs' }), { status: 409 });
  }

  const { data, error } = await service
    .from('cleaning_disputes')
    .insert({ job_id: params.id!, raised_by: userId, reason: parsed.data.reason })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Update job status
  await service.from('cleaning_jobs').update({ status: 'disputed' }).eq('id', params.id!);

  // Notify both parties + admin
  const otherUserId = job.owner_id === userId
    ? (job as any).cleaner_profiles?.user_id
    : job.owner_id;

  if (otherUserId) {
    await notify(service, otherUserId, 'dispute_raised', { job_id: job.id, dispute_id: data.id });
  }

  return new Response(JSON.stringify(data), { status: 201 });
};
