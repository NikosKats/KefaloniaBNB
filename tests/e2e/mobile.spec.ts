/**
 * Mobile-specific E2E tests (iPhone 14 and Pixel 7 viewports).
 *
 * Verifies that key user journeys work correctly on small screens.
 */
import { test, expect } from '@playwright/test';

// Device configuration is handled by playwright.config.ts projects
// (mobile-safari → iPhone 14, mobile-chrome → Pixel 7).
// test.use with full device presets is not allowed inside describe groups
// because device objects include defaultBrowserType which forces a new worker.

test.describe('Mobile — iPhone 14', () => {

  test('homepage renders without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('navigation is accessible on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mobile nav may use a hamburger menu or an inline nav
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('listings page renders on mobile', async ({ page }) => {
    await page.goto('/villas');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('contact page is readable on mobile', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('body')).toContainText('info@kefaloniabnb.com');
  });

  test('FAQs page renders on mobile', async ({ page }) => {
    await page.goto('/faqs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Mobile — Pixel 7', () => {

  test('homepage renders on Android', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('tap on listing card navigates to detail page', async ({ page }) => {
    await page.goto('/villas');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('[data-testid="listing-card"] a, article a').first();
    const count = await firstCard.count();
    if (count === 0) test.skip();

    await firstCard.tap();
    await page.waitForURL(/\/villas\/.+/, { timeout: 8_000 });
    expect(page.url()).toMatch(/\/villas\/.+/);
  });
});

test.describe('Responsive images', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('listing images use srcset or width/height attributes', async ({ page }) => {
    await page.goto('/villas');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();
    if (count === 0) test.skip();

    // At least one image should be responsive
    let hasResponsive = false;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const srcset = await img.getAttribute('srcset');
      const width  = await img.getAttribute('width');
      if (srcset || width) {
        hasResponsive = true;
        break;
      }
    }
    expect(hasResponsive).toBe(true);
  });
});
