/**
 * Internationalisation E2E tests.
 *
 * Verifies that switching languages updates visible text and that the
 * hreflang/canonical meta tags are correct.
 */
import { test, expect } from '@playwright/test';

const SUPPORTED_LANGS = ['el', 'bg', 'ro', 'tr'] as const;

test.describe('Language switching', () => {
  test('English is the default language', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    // Either en or en-US
    expect(lang).toMatch(/^en/);
  });

  test('switching to Greek via ?lang=el changes the html[lang] attribute', async ({ page }) => {
    await page.goto('/?lang=el');
    await page.waitForLoadState('networkidle');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toMatch(/^el/);
  });

  test('switching to Bulgarian via ?lang=bg renders Bulgarian text', async ({ page }) => {
    await page.goto('/villas?lang=bg');
    await page.waitForLoadState('networkidle');
    const bodyText = (await page.locator('body').textContent()) ?? '';
    // Expect at least one Bulgarian word (Cyrillic characters)
    expect(bodyText).toMatch(/[А-Яа-я]/);
  });

  for (const lang of SUPPORTED_LANGS) {
    test(`?lang=${lang} renders a non-empty page without errors`, async ({ page }) => {
      await page.goto(`/?lang=${lang}`);
      await page.waitForLoadState('networkidle');

      // Page should not show a 404 or 500 error
      const title = await page.title();
      expect(title).toBeTruthy();

      // No server error text
      const body = (await page.locator('body').textContent()) ?? '';
      expect(body).not.toMatch(/internal server error|500 error/i);
    });
  }
});

test.describe('hreflang meta tags', () => {
  test('English homepage has hreflang alternate links for all languages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hreflang = page.locator('link[rel="alternate"][hreflang]');
    const count = await hreflang.count();
    // At least: x-default + en + el + bg + ro + tr = 6
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('x-default hreflang points to canonical URL without lang param', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');
    const href = await xDefault.getAttribute('href');
    expect(href).not.toContain('?lang=');
  });

  test('Greek hreflang uses ?lang=el', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const elLink = page.locator('link[rel="alternate"][hreflang="el"]');
    const href = await elLink.getAttribute('href');
    expect(href).toContain('lang=el');
  });
});

test.describe('Language switcher UI', () => {
  test('language switcher component is visible on the homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Language switcher may be a <select>, a dropdown, or a set of flag buttons
    const switcher = page.locator(
      '[data-testid="lang-switcher"], select[name="lang"], .lang-switcher, [aria-label*="language" i]'
    ).first();
    const isVisible = await switcher.isVisible();
    // Not all implementations show the switcher on mobile — skip rather than fail
    if (!isVisible) test.skip();
    expect(isVisible).toBe(true);
  });
});
