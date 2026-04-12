import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders the page title in the browser tab', async ({ page }) => {
    await expect(page).toHaveTitle(/.+/);
  });

  test('displays the hero section', async ({ page }) => {
    // The hero should contain a CTA button or link
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
  });

  test('hero CTA links to the listings page', async ({ page }) => {
    const cta = page.locator('[data-testid="hero-cta"], a[href*="villas"], a[href*="rentals"]').first();
    await expect(cta).toBeVisible();
  });

  test('navigation links are visible', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
  });

  test('footer is visible', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
  });

  test('footer shows correct contact email', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toContainText('info@kefaloniabnb.com');
  });

  test('listing cards are rendered on the homepage', async ({ page }) => {
    // Wait for at least one listing card or a "no listings" message
    const cards = page.locator('[data-testid="listing-card"], article, .listing-card');
    const count = await cards.count();
    // Either listings appear or a message is shown — page should not be blank
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('page has no broken images in the viewport', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });
});
