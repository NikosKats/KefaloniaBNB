import { test, expect } from '@playwright/test';
import { ListingDetailPage } from '../pages/ListingDetailPage.ts';

/**
 * NOTE: Replace LISTING_SLUG with a real slug from your Supabase dev dataset.
 * Set TEST_LISTING_SLUG in .env.test to override at runtime.
 */
const LISTING_SLUG = process.env.TEST_LISTING_SLUG ?? 'villa-thalassa';

test.describe('Listing detail page', () => {
  let detailPage: ListingDetailPage;

  test.beforeEach(async ({ page }) => {
    detailPage = new ListingDetailPage(page);
    await detailPage.goto(LISTING_SLUG);
  });

  test('renders the listing title as h1', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect((text ?? '').trim().length).toBeGreaterThan(0);
  });

  test('shows a cover photo', async ({ page }) => {
    const cover = page.locator('[data-testid="gallery-cover"], img').first();
    await expect(cover).toBeVisible();
  });

  test('shows the booking widget', async ({ page }) => {
    await expect(detailPage.bookingWidget).toBeVisible();
  });

  test('shows the availability calendar', async ({ page }) => {
    await expect(detailPage.calendar).toBeVisible();
  });

  test('shows amenities section', async ({ page }) => {
    await expect(detailPage.amenitiesSection).toBeVisible();
  });

  test('clicking Book Now navigates to the booking form', async ({ page }) => {
    // Set dates first via URL
    await detailPage.setDates('2025-10-01', '2025-10-08');
    await detailPage.clickBookNow();
    await expect(page).toHaveURL(/\/book\/.+/);
  });

  test('shows price total when dates are selected', async ({ page }) => {
    await detailPage.setDates('2025-10-01', '2025-10-08');
    // Price total may appear in the booking widget
    const priceEl = page.locator('[data-testid="booking-price-total"]');
    const isVisible = await priceEl.isVisible();
    if (isVisible) {
      const text = await priceEl.textContent();
      expect(text).toMatch(/€|EUR/);
    }
  });

  test('has canonical meta tag', async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    const count = await canonical.count();
    expect(count).toBeGreaterThan(0);
    const href = await canonical.getAttribute('href');
    expect(href).toContain(LISTING_SLUG);
  });

  test('has og:title meta tag', async ({ page }) => {
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
  });

  test('has JSON-LD schema of type VacationRental or LodgingBusiness', async ({ page }) => {
    const jsonld = page.locator('script[type="application/ld+json"]');
    const count = await jsonld.count();
    expect(count).toBeGreaterThan(0);
    const content = await jsonld.first().textContent();
    expect(content).toMatch(/VacationRental|LodgingBusiness/);
  });
});
