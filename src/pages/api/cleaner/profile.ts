import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { requireSession } from '../../../lib/cleaning/permissions.ts';
import { UpdateCleanerProfileSchema } from '../../../lib/validators/cleaning.ts';

export const GET: APIRoute = async ({ locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const service = getServiceClient();
  const { data, error } = await service
    .from('cleaner_profiles')
    .select('*, cleaner_services(*), cleaner_service_areas(*)')
    .eq('user_id', userId)
    .single();

  if (error?.code === 'PGRST116') {
    return new Response(JSON.stringify(null), { status: 200 });
  }
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  const parsed = UpdateCleanerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from('cleaner_profiles')
    .insert({ user_id: userId, ...parsed.data })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 201 });
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  const parsed = UpdateCleanerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from('cleaner_profiles')
    .update(parsed.data)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};
