import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/api/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/i18n/**', 'src/middleware/**'],
      exclude: [
        'src/lib/supabase.ts',
        'src/lib/email.ts',
        'src/lib/telegram.ts',
        'src/lib/featured.ts',      // requires live Supabase
        'src/lib/stripe.ts',        // requires live Stripe
        'src/lib/cleaning/**',      // requires live DB + external services
        'src/lib/types/**',         // TypeScript type definitions only
        'src/lib/validators/**',    // cleaning validators (HTTP context)
        'src/middleware/**',        // requires full HTTP request pipeline
        'src/lib/guide-content.ts', // pure data export — no logic to test
        'src/lib/guide-i18n-part2.ts', // pure data export
        'src/lib/locations.ts',     // pure data export
        'src/i18n/locations-i18n.ts', // pure data export
      ],
      thresholds: { lines: 80, functions: 80, branches: 75 },
      reporter: ['text', 'lcov', 'html'],
    },
  },
  resolve: {
    alias: { '~': '/src' },
  },
});
