// src/lib/featured.ts
// Helpers for featured (sponsored) listing promotion.

import { getServiceClient } from './supabase.ts';

/**
 * Returns the listing IDs that currently have an active, non-expired
 * featured slot. Uses the service client so it works server-side only.
 */
export async function getActiveFeaturedListingIds(): Promise<string[]> {
  const service = getServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await service
    .from('featured_listings')
    .select('listing_id')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('expires_at', now);

  if (error || !data) return [];
  return data.map((row: { listing_id: string }) => row.listing_id);
}

/**
 * Returns true if the given listing currently has an active featured slot.
 */
export async function isFeaturedActive(listingId: string): Promise<boolean> {
  const ids = await getActiveFeaturedListingIds();
  return ids.includes(listingId);
}
