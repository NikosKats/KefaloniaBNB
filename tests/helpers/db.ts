// tests/helpers/db.ts
// Supabase service-client helpers for seeding and cleaning up test data.
// Used by Playwright globalSetup / globalTeardown and integration test suites.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { FIXTURES } from '../fixtures/users';
import { LISTING_FIXTURES } from '../fixtures/listings';

// ─── Service client ────────────────────────────────────────────────────────────

let _service: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (_service) return _service;

  const url = process.env.TEST_SUPABASE_URL;
  const key = process.env.TEST_SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_KEY must be set for DB helpers.',
    );
  }

  _service = createClient(url, key);
  return _service;
}

// ─── Seed helpers ──────────────────────────────────────────────────────────────

/** Ensure canonical test listings are present in the DB. */
export async function seedListings(): Promise<void> {
  const db = getServiceClient();
  await db.from('listings').upsert([
    { ...LISTING_FIXTURES.villaSunrise,  is_test: true },
    { ...LISTING_FIXTURES.seaViewStudio, is_test: true },
    { ...LISTING_FIXTURES.pendingCottage, is_test: true },
  ]);
}

/** Remove rows created during a test run. Accepts a tag used in IDs. */
export async function cleanupTestRun(runTag: string): Promise<void> {
  const db = getServiceClient();

  await db.from('cleaning_jobs').delete().like('id', `%${runTag}%`);
  await db.from('cleaning_matches').delete().like('id', `%${runTag}%`);
  await db.from('cleaning_requests').delete().like('id', `%${runTag}%`);
  await db.from('bookings').delete().like('id', `%${runTag}%`);
}

/** Delete all rows marked is_test=true from transactional tables. */
export async function purgeTestData(): Promise<void> {
  const db = getServiceClient();

  await db.from('cleaning_jobs').delete().eq('is_test', true);
  await db.from('cleaning_matches').delete().eq('is_test', true);
  await db.from('cleaning_requests').delete().eq('is_test', true);
  await db.from('bookings').delete().eq('is_test', true);
}

// ─── Login helper ──────────────────────────────────────────────────────────────

/**
 * Obtain a session cookie by POSTing credentials to the app's auth endpoint.
 * Returns the raw Set-Cookie header value for use in subsequent requests.
 */
export async function loginAs(
  baseUrl: string,
  credentials: { email: string; password: string },
  endpoint = '/api/auth/login',
): Promise<string> {
  const body = new FormData();
  body.append('email', credentials.email);
  body.append('password', credentials.password);

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method:   'POST',
    body,
    redirect: 'manual',
  });

  const cookie = res.headers.get('set-cookie');
  if (!cookie) {
    throw new Error(
      `Login failed for ${credentials.email} — no Set-Cookie header (status ${res.status})`,
    );
  }
  return cookie;
}

/** Convenience: log in as super_admin. */
export async function loginAsAdmin(baseUrl: string): Promise<string> {
  return loginAs(baseUrl, {
    email:    FIXTURES.superAdmin.email,
    password: FIXTURES.superAdmin.password,
  });
}

/** Convenience: log in as Nikos (property_owner). */
export async function loginAsNikos(baseUrl: string): Promise<string> {
  return loginAs(baseUrl, {
    email:    FIXTURES.owners.nikos.email,
    password: FIXTURES.owners.nikos.password,
  });
}

/** Convenience: log in as Elena (cleaner). */
export async function loginAsElena(baseUrl: string): Promise<string> {
  return loginAs(baseUrl, {
    email:    FIXTURES.cleaners.elena.email,
    password: FIXTURES.cleaners.elena.password,
  }, '/api/auth/cleaner-login');
}
