/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare/types.d.ts" />

declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient;
    session: import('@supabase/supabase-js').Session | null;
    profile?: import('./types/index.ts').Profile | null;
    lang: import('./i18n/translations.ts').Lang;
    /** Listing IDs the current property_owner owns — empty for admin/super_admin */
    ownerListingIds: string[];
    /** Restaurant IDs the current restaurant_owner owns — empty for admin/super_admin */
    ownerRestaurantIds: string[];
  }
}
