import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage.ts';
import { AdminBookingsPage } from '../pages/AdminBookingsPage.ts';

/**
 * These tests require admin credentials.
 * Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in .env.test.
 * Without them, all tests are skipped.
 */
test.describe('Admin bookings list', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL) test.skip();

    const loginPage = new AdminLoginPage(page);
    await loginPage.loginAsAdmin();
  });

  test('navigates to /admin/bookings', async ({ page }) => {
    const bookingsPage = new AdminBookingsPage(page);
    await bookingsPage.goto();
    await expect(page).toHaveURL(/\/admin\/bookings/);
  });

  test('displays booking rows or empty state', async ({ page }) => {
    const bookingsPage = new AdminBookingsPage(page);
    await bookingsPage.goto();

    const count = await bookingsPage.getRowCount();
    const empty = page.locator('text=/no bookings/i');
    const emptyCount = await empty.count();
    expect(count + emptyCount).toBeGreaterThan(0);
  });

  test('search input is present', async ({ page }) => {
    const bookingsPage = new AdminBookingsPage(page);
    await bookingsPage.goto();
    await expect(bookingsPage.searchInput).toBeVisible();
  });
});

test.describe('Admin booking detail', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_BOOKING_ID) test.skip();

    const loginPage = new AdminLoginPage(page);
    await loginPage.loginAsAdmin();
  });

  test('shows booking details', async ({ page }) => {
    const bookingId = process.env.TEST_BOOKING_ID!;
    const bookingsPage = new AdminBookingsPage(page);
    await bookingsPage.openBooking(bookingId);

    // Page should show guest name, dates, and total
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('super admin sees Payout Split section', async ({ page }) => {
    if (process.env.TEST_ADMIN_ROLE !== 'super_admin') test.skip();

    const bookingId = process.env.TEST_BOOKING_ID!;
    const bookingsPage = new AdminBookingsPage(page);
    await bookingsPage.openBooking(bookingId);

    const payoutSection = page.locator('text=/payout split/i');
    await expect(payoutSection).toBeVisible();
  });
});

test.describe('Admin — mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('hamburger button is visible on mobile', async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL) test.skip();

    const loginPage = new AdminLoginPage(page);
    await loginPage.loginAsAdmin();

    const hamburger = page.locator('[data-testid="sidebar-open"], button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible();
  });

  test('hamburger opens the sidebar', async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL) test.skip();

    const loginPage = new AdminLoginPage(page);
    await loginPage.loginAsAdmin();

    const hamburger = page.locator('[data-testid="sidebar-open"], button[aria-label*="menu" i]').first();
    if (!await hamburger.isVisible()) test.skip();

    await hamburger.click();

    const sidebar = page.locator('#sidebar, [data-testid="sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 3_000 });
  });

  test('"View site" link is accessible on mobile', async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL) test.skip();

    const loginPage = new AdminLoginPage(page);
    await loginPage.loginAsAdmin();

    const viewSiteLink = page.locator('a[href="/"], a[href="/"]:visible, [data-testid="view-site-link"]').first();
    await expect(viewSiteLink).toBeVisible();
  });
});
