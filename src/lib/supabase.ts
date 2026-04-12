import { createClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { getEnv } from './env.ts';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Browser client (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client (bypasses RLS — server-side API routes ONLY)
export function getServiceClient() {
  const env = getEnv();
  return createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// SSR session-aware client for Astro pages
export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}

// For use in API routes with raw Request/Response
export function createSupabaseRequestClient(request: Request, headers: Headers) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append('Set-Cookie', serializeCookieHeader(name, value, options));
        });
      },
    },
  });
}
