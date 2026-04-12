// tests/setup/playwright.teardown.ts
// Playwright globalTeardown — runs once after all E2E tests.
// Removes is_test=true rows from transactional tables.

import { purgeTestData } from '../helpers/db';

export default async function globalTeardown(): Promise<void> {
  const hasTestDb = !!(
    process.env.TEST_SUPABASE_URL &&
    process.env.TEST_SUPABASE_SERVICE_KEY
  );

  if (!hasTestDb) {
    console.log('[playwright teardown] No TEST_SUPABASE_URL — skipping cleanup');
    return;
  }

  try {
    await purgeTestData();
    console.log('[playwright teardown] Test data purged');
  } catch (err) {
    console.error('[playwright teardown] Cleanup failed:', err);
  }
}
