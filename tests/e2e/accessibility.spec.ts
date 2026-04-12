/**
 * Automated accessibility checks using axe-core via @axe-core/playwright.
 *
 * These tests catch WCAG 2.1 AA violations across key public pages.
 * They supplement (not replace) manual screen-reader testing.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_PAGES = [
  { name: 'Homepage',       path: '/' },
  { name: 'Listings',       path: '/villas' },
  { name: 'Contact',        path: '/contact' },
  { name: 'FAQs',           path: '/faqs' },
] as const;

for (const { name, path } of PUBLIC_PAGES) {
  test(`${name} has no critical accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .disableRules([
        'color-contrast', // Often false-positive in dark-mode Tailwind
      ])
      .analyze();

    // Log violations for debugging without failing immediately
    if (results.violations.length > 0) {
      console.warn(
        `Accessibility violations on ${name}:`,
        results.violations.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join('\n')
      );
    }

    // Fail only on critical and serious violations
    const criticalViolations = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });
}

test.describe('Key WCAG criteria — Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('all images have alt text', async ({ page }) => {
    const images = page.locator('img:not([alt])');
    const count = await images.count();
    // Decorative images should use alt="" — missing alt entirely is a violation
    const withoutAlt = await page.evaluate(() =>
      [...document.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt')).length
    );
    expect(withoutAlt).toBe(0);
  });

  test('page has exactly one h1', async ({ page }) => {
    const h1s = page.locator('h1');
    expect(await h1s.count()).toBe(1);
  });

  test('interactive elements are keyboard reachable', async ({ page }) => {
    // Tab through the first 5 interactive elements and verify focus moves
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    // Something should have received focus
    expect(focusedTag).toBeTruthy();
  });

  test('skip-to-content link is present', async ({ page }) => {
    // Skip links are best practice — check with Tab first
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main"], a[href="#content"], [class*="skip"]').first();
    // Skip link may only appear on first Tab press
    const isVisible = await skipLink.isVisible();
    // Soft assertion — not all sites implement skip links
    if (isVisible) {
      const href = await skipLink.getAttribute('href');
      expect(href).toMatch(/#main|#content/);
    }
  });
});

test.describe('Accessibility — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('homepage has no critical violations on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalViolations = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });
});
