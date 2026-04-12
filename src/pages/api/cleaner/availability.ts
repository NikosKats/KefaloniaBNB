import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';
import { requireSession } from '../../../lib/cleaning/permissions.ts';
import { SetAvailabilitySchema } from '../../../lib/validators/cleaning.ts';

async function getCleanerId(service: any, userId: string): Promise<string | null> {
  const { data } = await service
    .from('cleaner_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id ?? null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const service = getServiceClient();
  const cleanerId = await getCleanerId(service, userId);
  if (!cleanerId) return new Response(JSON.stringify([]), { status: 200 });

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = service
    .from('cleaner_availability')
    .select('*')
    .eq('cleaner_id', cleanerId);

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query.order('date');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const guard = requireSession(locals);
  if (guard) return guard;

  const userId = locals.session!.user.id;
  const body = await request.json().catch(() => null);
  const parsed = SetAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const service = getServiceClient();
  const cleanerId = await getCleanerId(service, userId);
  if (!cleanerId) {
    return new Response(JSON.stringify({ error: 'Cleaner profile not found' }), { status: 404 });
  }

  const rows = parsed.data.dates.map(date => ({
    cleaner_id: cleanerId,
    date,
    is_available: parsed.data.is_available,
  }));

  const { error } = await service
    .from('cleaner_availability')
    .upsert(rows, { onConflict: 'cleaner_id,date' });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true, count: rows.length }), { status: 200 });
};
