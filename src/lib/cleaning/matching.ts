import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Find active cleaners who:
 * 1. Serve the listing's city/region
 * 2. Offer a service for the listing's property_type + bedrooms
 * 3. Have marked the requested_date as available (or have no explicit unavailability)
 */
export async function findMatchingCleaners(
  supabase: SupabaseClient,
  params: {
    city: string;
    region: string;
    property_type: string;
    bedrooms: number;
    requested_date: string;
  }
) {
  const { city, region, property_type, bedrooms, requested_date } = params;

  // Get cleaners in the area
  const { data: areaRows } = await supabase
    .from('cleaner_service_areas')
    .select('cleaner_id')
    .or(`region.eq.${region},city.eq.${city}`);

  if (!areaRows?.length) return [];

  const cleanerIds = [...new Set(areaRows.map((r: any) => r.cleaner_id))];

  // Filter by service capability
  const { data: serviceRows } = await supabase
    .from('cleaner_services')
    .select('cleaner_id, base_price, duration_hours')
    .in('cleaner_id', cleanerIds)
    .eq('property_type', property_type)
    .lte('bedrooms_min', bedrooms)
    .gte('bedrooms_max', bedrooms);

  if (!serviceRows?.length) return [];

  const capableIds = serviceRows.map((r: any) => r.cleaner_id);

  // Filter out explicitly unavailable
  const { data: unavailable } = await supabase
    .from('cleaner_availability')
    .select('cleaner_id')
    .in('cleaner_id', capableIds)
    .eq('date', requested_date)
    .eq('is_available', false);

  const unavailableSet = new Set((unavailable ?? []).map((r: any) => r.cleaner_id));
  const availableIds = capableIds.filter((id: string) => !unavailableSet.has(id));

  if (!availableIds.length) return [];

  // Get full profiles
  const { data: profiles } = await supabase
    .from('cleaner_profiles')
    .select('*')
    .in('id', availableIds)
    .eq('is_active', true);

  return (profiles ?? []).map((p: any) => ({
    ...p,
    service: serviceRows.find((s: any) => s.cleaner_id === p.id),
  }));
}
