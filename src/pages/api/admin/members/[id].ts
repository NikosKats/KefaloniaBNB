import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

function requireAdmin(locals: any) {
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  return null;
}

/**
 * PATCH /api/admin/members/:id
 * Update member profile fields (ban/unban, edit name, phone, etc.)
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();

  // Admin set password
  if (body.password) {
    if (typeof body.password !== 'string' || body.password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const { error: pwErr } = await service.auth.admin.updateUser(params.id!, { password: body.password, email_confirm: true });
    if (pwErr) {
      return new Response(JSON.stringify({ error: pwErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const allowed = ['full_name', 'email', 'phone', 'location', 'hometown', 'bio', 'is_active', 'avatar_url'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { data, error } = await service
    .from('profiles')
    .update(updates)
    .eq('id', params.id)
    .eq('role', 'member')
    .select()
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Member not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ member: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

/**
 * DELETE /api/admin/members/:id
 * Permanently delete a member — removes all their content and auth user.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const role = locals.profile?.role;
  if (role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const service = getServiceClient();
  const id = params.id!;

  // Verify it's a member
  const { data: profile } = await service.from('profiles').select('role').eq('id', id).single();
  if (!profile || profile.role !== 'member') {
    return new Response(JSON.stringify({ error: 'Member not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Clean up community content
  await service.from('community_likes').delete().eq('user_id', id);
  await service.from('community_comments').delete().eq('author_id', id);
  await service.from('community_posts').delete().eq('author_id', id);
  await service.from('community_reports').delete().eq('reporter_id', id);

  // Delete auth user (cascades to profile)
  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
