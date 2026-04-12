import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../../lib/supabase.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const err = (msg: string, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: JSON_HEADERS });

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const service = getServiceClient();
  const { data, error } = await service
    .from('seasons')
    .select('*')
    .eq('listing_id', params.id!)
    .order('start_date');
  if (error) return err('Failed to fetch seasons', 500);
  return new Response(JSON.stringify({ seasons: data }), { status: 200, headers: JSON_HEADERS });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const body = await request.json();
  const { name, start_date, end_date, price_modifier, min_nights } = body;

  if (!name || !start_date || !end_date || !price_modifier)
    return err('name, start_date, end_date, price_modifier are required');
  if (end_date < start_date) return err('end_date must be >= start_date');
  const mod = parseFloat(price_modifier);
  if (isNaN(mod) || mod <= 0) return err('price_modifier must be a positive number');

  const service = getServiceClient();
  const { data, error } = await service
    .from('seasons')
    .insert({
      listing_id: params.id,
      name: name.trim(),
      start_date,
      end_date,
      price_modifier: mod,
      min_nights: min_nights ? parseInt(min_nights) : null,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return new Response(JSON.stringify({ season: data }), { status: 201, headers: JSON_HEADERS });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.session) return err('Unauthorized', 401);
  const { id: seasonId } = await request.json();
  if (!seasonId) return err('season id required');

  const service = getServiceClient();
  const { error } = await service.from('seasons').delete().eq('id', seasonId);
  if (error) return err(error.message, 500);
  return new Response(null, { status: 204 });
};
