import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireAdmin } from '../../../../../lib/cleaning/permissions.ts';
import { ResolveDisputeSchema } from '../../../../../lib/validators/cleaning.ts';
import { notify } from '../../../../../lib/cleaning/notifications.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const guard = requireAdmin(locals);
  if (guard) return guard;

  const adminId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  const parsed = ResolveDisputeSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const service = getServiceClient();

  const { data: dispute } = await service
    .from('cleaning_disputes')
    .select('*, cleaning_jobs(owner_id, cleaner_id, cleaner_profiles(user_id))')
    .eq('id', params.id!)
    .single();

  if (!dispute) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const { error } = await service
    .from('cleaning_disputes')
    .update({
      status: parsed.data.status,
      resolution: parsed.data.resolution,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', params.id!);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const job = (dispute as any).cleaning_jobs;
  if (job) {
    const cleanerUserId = job.cleaner_profiles?.user_id;
    const userIds = [job.owner_id, cleanerUserId].filter(Boolean) as string[];
    for (const uid of userIds) {
      await notify(service, uid, 'dispute_resolved', { dispute_id: dispute.id, job_id: job.id });
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
