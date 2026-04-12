import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireSession, isAdmin } from '../../../../../lib/cleaning/permissions.ts';
import { notify } from '../../../../../lib/cleaning/notifications.ts';
import { sendCleanerPayout } from '../../../../../lib/cleaning/payouts.ts';

const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled:  ['started', 'cancelled'],
  started:    ['completed', 'cancelled'],
  completed:  ['approved', 'disputed'],
  disputed:   ['approved', 'cancelled'],
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  if (!body?.status) {
    return new Response(JSON.stringify({ error: 'status required' }), { status: 400 });
  }

  const service = getServiceClient();
  const { data: job } = await service
    .from('cleaning_jobs')
    .select('*, cleaner_profiles(user_id)')
    .eq('id', params.id!)
    .single();

  if (!job) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const cleanerUserId = (job as any).cleaner_profiles?.user_id;
  const isCleaner = cleanerUserId === userId;
  const isOwnerJob = job.owner_id === userId;
  const admin = isAdmin(locals);

  if (!isCleaner && !isOwnerJob && !admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const allowed = VALID_TRANSITIONS[job.status] ?? [];
  if (!allowed.includes(body.status)) {
    return new Response(JSON.stringify({ error: `Cannot transition from ${job.status} to ${body.status}` }), { status: 409 });
  }

  // Role-based permission on specific transitions
  if (body.status === 'started' && !isCleaner && !admin) {
    return new Response(JSON.stringify({ error: 'Only cleaner can start job' }), { status: 403 });
  }
  if (body.status === 'completed' && !isCleaner && !admin) {
    return new Response(JSON.stringify({ error: 'Only cleaner can mark complete' }), { status: 403 });
  }
  if (body.status === 'approved' && !isOwnerJob && !admin) {
    return new Response(JSON.stringify({ error: 'Only owner can approve' }), { status: 403 });
  }

  // Enforce checklist + after photo before marking complete
  if (body.status === 'completed') {
    const [{ data: checklistItems }, { data: afterPhotos }] = await Promise.all([
      service.from('job_checklist_items').select('is_done').eq('job_id', params.id!),
      service.from('job_photos').select('id').eq('job_id', params.id!).eq('phase', 'after'),
    ]);
    const undone = (checklistItems ?? []).filter((i: any) => !i.is_done);
    if (undone.length > 0) {
      return new Response(JSON.stringify({ error: `${undone.length} checklist item${undone.length > 1 ? 's' : ''} not completed yet` }), { status: 409 });
    }
    if ((afterPhotos ?? []).length === 0) {
      return new Response(JSON.stringify({ error: 'At least one after photo is required before marking complete' }), { status: 409 });
    }
  }

  const updates: Record<string, unknown> = { status: body.status };
  if (body.status === 'started') updates.started_at = new Date().toISOString();
  if (body.status === 'completed') updates.completed_at = new Date().toISOString();
  if (body.status === 'approved') updates.approved_at = new Date().toISOString();
  if (body.notes) updates.notes = body.notes;

  const { data: updated, error } = await service
    .from('cleaning_jobs')
    .update(updates)
    .eq('id', params.id!)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Notifications
  if (body.status === 'started') {
    await notify(service, job.owner_id, 'job_started', { job_id: job.id });
  }
  if (body.status === 'completed') {
    await notify(service, job.owner_id, 'job_completed', { job_id: job.id });
  }
  if (body.status === 'approved') {
    if (cleanerUserId) {
      await notify(service, cleanerUserId, 'job_approved', { job_id: job.id });
    }
    // Trigger payout
    try {
      await sendCleanerPayout(job.id);
      if (cleanerUserId) {
        await notify(service, cleanerUserId, 'payout_sent', { job_id: job.id });
      }
    } catch (e) {
      console.error('Payout failed:', e);
    }
  }

  return new Response(JSON.stringify(updated), { status: 200 });
};
