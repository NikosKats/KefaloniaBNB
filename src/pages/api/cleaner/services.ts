import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { requireSession } from '../../../lib/cleaning/permissions.ts';
import { UpsertServiceSchema } from '../../../lib/validators/cleaning.ts';

async function getCleanerId(service: any, userId: string): Promise<string | null> {
  const { data } = await service
    .from('cleaner_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id ?? null;
}

export const GET: APIRoute = async ({ locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const service = getServiceClient();
  const cleanerId = await getCleanerId(service, userId);
  if (!cleanerId) return new Response(JSON.stringify([]), { status: 200 });

  const { data, error } = await service
    .from('cleaner_services')
    .select('*')
    .eq('cleaner_id', cleanerId);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  const parsed = UpsertServiceSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const service = getServiceClient();
  const cleanerId = await getCleanerId(service, userId);
  if (!cleanerId) {
    return new Response(JSON.stringify({ error: 'Cleaner profile not found' }), { status: 404 });
  }

  const { id, ...rest } = parsed.data;
  let result;
  if (id) {
    result = await service
      .from('cleaner_services')
      .update(rest)
      .eq('id', id)
      .eq('cleaner_id', cleanerId)
      .select()
      .single();
  } else {
    result = await service
      .from('cleaner_services')
      .insert({ cleaner_id: cleanerId, ...rest })
      .select()
      .single();
  }

  if (result.error) return new Response(JSON.stringify({ error: result.error.message }), { status: 500 });
  return new Response(JSON.stringify(result.data), { status: 201 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  if (!body?.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const service = getServiceClient();
  const cleanerId = await getCleanerId(service, userId);
  if (!cleanerId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const { error } = await service
    .from('cleaner_services')
    .delete()
    .eq('id', body.id)
    .eq('cleaner_id', cleanerId);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
