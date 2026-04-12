import type { APIRoute } from 'astro';
import { getServiceClient } from '../../../lib/supabase.ts';

/**
 * GET /api/admin/guests
 *
 * Returns aggregated guest data with tier segmentation.
 * Guest identity is derived from guest_email on the bookings table.
 *
 * Query params:
 *   search      — filter by name, email, or phone (ILIKE)
 *   tier        — Low | Mid | High
 *   min_spent   — minimum total_spent
 *   max_spent   — maximum total_spent
 *   property_id — only guests who booked this listing
 *   sort_by     — total_spent | last_booking_date | bookings_count (default: total_spent)
 *   order       — asc | desc (default: desc)
 *   page        — page number (default: 1)
 *   per_page    — rows per page (default: 25, max: 100)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const role = locals.profile?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const search     = url.searchParams.get('search')?.trim() ?? '';
  const tier       = url.searchParams.get('tier') ?? '';
  const minSpent   = parseFloat(url.searchParams.get('min_spent') ?? '') || 0;
  const maxSpent   = parseFloat(url.searchParams.get('max_spent') ?? '') || 0;
  const propertyId = url.searchParams.get('property_id') ?? '';
  const sortBy     = url.searchParams.get('sort_by') ?? 'total_spent';
  const order      = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const page       = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1);
  const perPage    = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') ?? '25') || 25));

  const service = getServiceClient();

  // ── Build the aggregation query via raw SQL through RPC ────────────────────
  // Since Supabase JS doesn't support views with complex filtering well,
  // we query the bookings table directly with aggregation.

  const conditions: string[] = [
    "guest_email IS NOT NULL",
    "guest_email != ''",
  ];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (propertyId) {
    conditions.push(`listing_id = $${paramIdx}`);
    params.push(propertyId);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  // Outer HAVING / WHERE filters (applied after aggregation)
  const havingConds: string[] = [];

  if (search) {
    havingConds.push(`(
      guest_name ILIKE $${paramIdx}
      OR guest_email ILIKE $${paramIdx}
      OR guest_phone ILIKE $${paramIdx}
    )`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (minSpent > 0) {
    havingConds.push(`total_spent >= $${paramIdx}`);
    params.push(minSpent);
    paramIdx++;
  }

  if (maxSpent > 0) {
    havingConds.push(`total_spent <= $${paramIdx}`);
    params.push(maxSpent);
    paramIdx++;
  }

  // Tier filtering — computed dynamically
  if (tier === 'Low') {
    havingConds.push(`total_spent BETWEEN 1 AND 200`);
  } else if (tier === 'Mid') {
    havingConds.push(`total_spent BETWEEN 201 AND 999`);
  } else if (tier === 'High') {
    havingConds.push(`total_spent >= 1000`);
  }

  const havingClause = havingConds.length ? `WHERE ${havingConds.join(' AND ')}` : '';

  // Sort validation
  const validSorts: Record<string, string> = {
    total_spent: 'total_spent',
    last_booking_date: 'last_booking_date',
    bookings_count: 'bookings_count',
  };
  const sortCol = validSorts[sortBy] ?? 'total_spent';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  const offset = (page - 1) * perPage;

  // Two queries: count + data (run in parallel would be ideal but RPC is simpler sequential)
  const sql = `
    WITH agg AS (
      SELECT
        guest_email,
        (ARRAY_AGG(guest_name ORDER BY created_at DESC))[1]    AS guest_name,
        (ARRAY_AGG(guest_phone ORDER BY created_at DESC))[1]   AS guest_phone,
        (ARRAY_AGG(guest_country ORDER BY created_at DESC))[1] AS guest_country,
        COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed','completed')), 0) AS total_spent,
        COUNT(*) FILTER (WHERE status IN ('confirmed','completed'))                       AS bookings_count,
        MAX(created_at) FILTER (WHERE status IN ('confirmed','completed'))                AS last_booking_date
      FROM bookings
      WHERE ${whereClause}
      GROUP BY guest_email
    )
    SELECT *, COUNT(*) OVER() AS _total_count
    FROM agg
    ${havingClause}
    ORDER BY ${sortCol} ${sortDir} NULLS LAST
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const { data: rows, error } = await service.rpc('exec_sql', { query: sql, params });

  // Fallback: if RPC doesn't exist, use the view approach with Supabase client
  if (error) {
    return await fallbackQuery(service, { search, tier, minSpent, maxSpent, propertyId, sortCol, sortDir: order, page, perPage });
  }

  const totalCount = rows?.[0]?._total_count ?? 0;
  const guests = (rows ?? []).map((r: any) => ({
    guest_email: r.guest_email,
    guest_name: r.guest_name,
    guest_phone: r.guest_phone,
    guest_country: r.guest_country,
    total_spent: parseFloat(r.total_spent) || 0,
    bookings_count: parseInt(r.bookings_count) || 0,
    last_booking_date: r.last_booking_date,
    tier: computeTier(parseFloat(r.total_spent) || 0),
  }));

  return new Response(JSON.stringify({
    guests,
    total: parseInt(totalCount),
    page,
    per_page: perPage,
    total_pages: Math.ceil(parseInt(totalCount) / perPage),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

function computeTier(totalSpent: number): 'Low' | 'Mid' | 'High' | 'None' {
  if (totalSpent >= 1000) return 'High';
  if (totalSpent >= 201) return 'Mid';
  if (totalSpent >= 1) return 'Low';
  return 'None';
}

/**
 * Fallback: query bookings directly via Supabase client, aggregate in JS.
 * Used when exec_sql RPC is not available.
 */
async function fallbackQuery(
  service: ReturnType<typeof getServiceClient>,
  opts: { search: string; tier: string; minSpent: number; maxSpent: number; propertyId: string; sortCol: string; sortDir: string; page: number; perPage: number },
) {
  let query = service
    .from('bookings')
    .select('guest_email, guest_name, guest_phone, guest_country, total_price, status, listing_id, created_at')
    .not('guest_email', 'is', null)
    .neq('guest_email', '');

  if (opts.propertyId) {
    query = query.eq('listing_id', opts.propertyId);
  }

  const { data: bookings, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Aggregate in JS
  const map = new Map<string, {
    guest_email: string; guest_name: string; guest_phone: string | null;
    guest_country: string | null; total_spent: number; bookings_count: number;
    last_booking_date: string | null; latest_created: string;
  }>();

  for (const b of bookings ?? []) {
    const isCompleted = b.status === 'confirmed' || b.status === 'completed';
    let entry = map.get(b.guest_email);
    if (!entry) {
      entry = {
        guest_email: b.guest_email,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        guest_country: b.guest_country,
        total_spent: 0,
        bookings_count: 0,
        last_booking_date: null,
        latest_created: b.created_at,
      };
      map.set(b.guest_email, entry);
    }
    // Always update name/phone to the most recent booking
    if (b.created_at > entry.latest_created) {
      entry.guest_name = b.guest_name;
      entry.guest_phone = b.guest_phone;
      entry.guest_country = b.guest_country;
      entry.latest_created = b.created_at;
    }
    if (isCompleted) {
      entry.total_spent += b.total_price;
      entry.bookings_count++;
      if (!entry.last_booking_date || b.created_at > entry.last_booking_date) {
        entry.last_booking_date = b.created_at;
      }
    }
  }

  let guests = Array.from(map.values()).map(g => ({
    ...g,
    tier: computeTier(g.total_spent),
  }));

  // Apply filters
  if (opts.search) {
    const s = opts.search.toLowerCase();
    guests = guests.filter(g =>
      g.guest_name?.toLowerCase().includes(s) ||
      g.guest_email.toLowerCase().includes(s) ||
      g.guest_phone?.toLowerCase().includes(s)
    );
  }
  if (opts.tier) {
    guests = guests.filter(g => g.tier === opts.tier);
  }
  if (opts.minSpent > 0) {
    guests = guests.filter(g => g.total_spent >= opts.minSpent);
  }
  if (opts.maxSpent > 0) {
    guests = guests.filter(g => g.total_spent <= opts.maxSpent);
  }

  // Sort
  const dir = opts.sortDir === 'asc' ? 1 : -1;
  guests.sort((a, b) => {
    const key = opts.sortCol as keyof typeof a;
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    return av > bv ? dir : av < bv ? -dir : 0;
  });

  // Paginate
  const total = guests.length;
  const start = (opts.page - 1) * opts.perPage;
  const paged = guests.slice(start, start + opts.perPage);

  return new Response(JSON.stringify({
    guests: paged,
    total,
    page: opts.page,
    per_page: opts.perPage,
    total_pages: Math.ceil(total / opts.perPage),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
