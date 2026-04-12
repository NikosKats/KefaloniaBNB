import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Extended fixture type
type KefaloniaFixtures = {
  /** Run axe accessibility check on current page, fail on critical/serious */
  checkA11y: () => Promise<void>;
  /** Navigate to booking form with preset dates */
  bookingPage: { checkIn: string; checkOut: string; guests: number };
};

export const test = base.extend<KefaloniaFixtures>({
  checkA11y: async ({ page }, use) => {
    await use(async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast']) // design decision — revisit
        .analyze();
      expect(
        results.violations.filter((v) => ['critical', 'serious'].includes(v.impact!)),
        `Accessibility violations: ${JSON.stringify(results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2)}`
      ).toHaveLength(0);
    });
  },

  bookingPage: async ({}, use) => {
    // Use a fixed future date window so tests are deterministic
    await use({ checkIn: '2026-06-15', checkOut: '2026-06-22', guests: 2 });
  },
});

export { expect } from '@playwright/test';
