// tests/setup/playwright.setup.ts
// Playwright globalSetup — runs once before all E2E tests.
// Seeds canonical test listings if TEST_SUPABASE_URL is configured.

import { seedListings } from '../helpers/db';

export default async function globalSetup(): Promise<void> {
  const hasTestDb = !!(
    process.env.TEST_SUPABASE_URL &&
    process.env.TEST_SUPABASE_SERVICE_KEY
  );

  if (!hasTestDb) {
    console.log('[playwright setup] No TEST_SUPABASE_URL — skipping DB seed');
    return;
  }

  try {
    await seedListings();
    console.log('[playwright setup] Test listings seeded');
  } catch (err) {
    console.error('[playwright setup] Failed to seed listings:', err);
    // Don't throw — let individual tests handle missing data gracefully
  }
}
