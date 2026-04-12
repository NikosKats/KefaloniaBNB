import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage.ts';

test.describe('Admin authentication', () => {
  let loginPage: AdminLoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new AdminLoginPage(page);
    await loginPage.goto();
  });

  test('renders the login form', async ({ page }) => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitBtn).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await expect(loginPage.errorMsg).toBeVisible({ timeout: 8_000 });
  });

  test('unauthenticated request to /admin redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/admin/login', { timeout: 8_000 });
    expect(page.url()).toContain('/admin/login');
  });

  test('unauthenticated request to /admin/bookings redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 });
  });

  test('login with valid credentials redirects to /admin dashboard', async ({ page }) => {
    // Only runs if TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are set
    if (!process.env.TEST_ADMIN_EMAIL) test.skip();

    await loginPage.loginAsAdmin();
    await expect(page).toHaveURL(/\/admin$|\/admin\//, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/admin\/login/);
  });
});

test.describe('Admin — logout', () => {
  test('logout redirects to /admin/login', async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL) test.skip();

    const loginPage = new AdminLoginPage(page);
    await loginPage.loginAsAdmin();

    // Find and click logout
    const logoutBtn = page.locator('[data-testid="logout-btn"], a[href*="logout"], button:text-is("Logout"), button:text-is("Sign out")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 });
    }
  });
});
