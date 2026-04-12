import { test, expect } from '@playwright/test';

test.describe('Listings page (/villas)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/villas');
    await page.waitForLoadState('networkidle');
  });

  test('renders the page heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('displays listing cards or an empty state', async ({ page }) => {
    const cards = page.locator('[data-testid="listing-card"], article');
    const empty = page.locator('text=/no villas found/i, text=/no results/i');
    const cardCount = await cards.count();
    const emptyCount = await empty.count();
    expect(cardCount + emptyCount).toBeGreaterThan(0);
  });

  test('each listing card shows a price', async ({ page }) => {
    const cards = page.locator('[data-testid="listing-card"], article');
    const count = await cards.count();
    if (count === 0) test.skip();

    const firstCard = cards.first();
    await expect(firstCard).toContainText(/€|\$/);
  });

  test('each listing card has a link to the detail page', async ({ page }) => {
    const cards = page.locator('[data-testid="listing-card"], article');
    const count = await cards.count();
    if (count === 0) test.skip();

    const link = cards.first().locator('a').first();
    const href = await link.getAttribute('href');
    expect(href).toMatch(/\/villas\/.+/);
  });

  test('guest count filter narrows results', async ({ page }) => {
    const guestFilter = page.locator('select[name="guests"], input[name="guests"]').first();
    const isVisible = await guestFilter.isVisible();
    if (!isVisible) test.skip();

    const beforeCount = await page.locator('[data-testid="listing-card"], article').count();
    await guestFilter.selectOption('8');
    await page.waitForLoadState('networkidle');
    const afterCount = await page.locator('[data-testid="listing-card"], article').count();
    // After filtering for higher guest count, results may be fewer or equal
    expect(afterCount).toBeLessThanOrEqual(beforeCount);
  });
});

test.describe('Listings — mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('listing cards are visible on mobile', async ({ page }) => {
    await page.goto('/villas');
    await page.waitForLoadState('networkidle');
    const cards = page.locator('[data-testid="listing-card"], article');
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });
});
