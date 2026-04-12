// tests/setup/vitest.setup.ts
// Global Vitest setup — runs before each test file.
// Loads .env.test.local for integration tests that require TEST_SUPABASE_URL.

import { config } from 'dotenv';
import { resolve } from 'path';

// Load test-local env overrides (not committed to VCS)
config({ path: resolve(process.cwd(), '.env.test.local'), override: false });
config({ path: resolve(process.cwd(), '.env.test'), override: false });
