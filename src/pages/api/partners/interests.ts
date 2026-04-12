import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

const J = { 'Content-Type': 'application/json' };
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: J });

// PATCH — update interest status/notes
export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const { id, status, notes } = await request.json();
  if (!id) return err('id required');

  const service = getServiceClient();
  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (notes !== undefined) update.notes = notes;

  const { error } = await service.from('partner_interests').update(update).eq('id', id);
  if (error) return err(error.message, 500);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
};
