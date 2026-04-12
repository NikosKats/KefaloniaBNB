import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../../lib/supabase.ts';
import { requireSession } from '../../../../../lib/cleaning/permissions.ts';
import { getJobChecklist, toggleChecklistItem, addChecklistItem, deleteChecklistItem } from '../../../../../lib/cleaning/checklist.ts';

export const GET: APIRoute = async ({ params, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const service = getServiceClient();
  const items = await getJobChecklist(service, params.id!);
  return new Response(JSON.stringify(items), { status: 200 });
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const body = await request.json().catch(() => null);
  if (!body?.item_id || typeof body.is_done !== 'boolean') {
    return new Response(JSON.stringify({ error: 'item_id and is_done required' }), { status: 400 });
  }

  const service = getServiceClient();
  const { error } = await toggleChecklistItem(service, body.item_id, body.is_done);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

// Add a new checklist item (owner only, job must be scheduled)
export const POST: APIRoute = async ({ params, request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const body = await request.json().catch(() => null);
  if (!body?.label?.trim()) {
    return new Response(JSON.stringify({ error: 'label required' }), { status: 400 });
  }

  const service = getServiceClient();
  const userId = locals.session!.user.id;

  // Verify job exists and user is the owner
  const { data: job } = await service
    .from('cleaning_jobs')
    .select('owner_id, status')
    .eq('id', params.id!)
    .single();

  if (!job) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  if (job.owner_id !== userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  if (job.status !== 'scheduled') return new Response(JSON.stringify({ error: 'Checklist can only be edited while job is scheduled' }), { status: 409 });

  const existing = await getJobChecklist(service, params.id!);
  const { data, error } = await addChecklistItem(service, params.id!, body.label.trim(), existing.length);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify(data), { status: 201 });
};

// Delete a checklist item (owner only, job must be scheduled)
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const body = await request.json().catch(() => null);
  if (!body?.item_id) {
    return new Response(JSON.stringify({ error: 'item_id required' }), { status: 400 });
  }

  const service = getServiceClient();
  const userId = locals.session!.user.id;

  const { data: job } = await service
    .from('cleaning_jobs')
    .select('owner_id, status')
    .eq('id', params.id!)
    .single();

  if (!job) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  if (job.owner_id !== userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  if (job.status !== 'scheduled') return new Response(JSON.stringify({ error: 'Checklist can only be edited while job is scheduled' }), { status: 409 });

  const { error } = await deleteChecklistItem(service, body.item_id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
