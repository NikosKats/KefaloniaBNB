import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const { id } = params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status && ['open', 'in_progress', 'resolved', 'closed'].includes(body.status)) {
    updates.status = body.status;
    if (body.status === 'resolved') updates.resolved_at = new Date().toISOString();
  }
  if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes;
  if (body.severity && ['low', 'medium', 'high', 'critical'].includes(body.severity)) updates.severity = body.severity;

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  updates.updated_at = new Date().toISOString();
  const service = getServiceClient();
  const { data, error } = await service.from('reports').update(updates).eq('id', id).select().single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Report not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ report: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const { error } = await service.from('reports').delete().eq('id', params.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
