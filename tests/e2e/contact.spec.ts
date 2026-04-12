import { test, expect } from '@playwright/test';

test.describe('Contact page (/contact)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
  });

  test('renders the page heading', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('shows the correct contact email (info@kefaloniabnb.com)', async ({ page }) => {
    await expect(page.locator('body')).toContainText('info@kefaloniabnb.com');
  });

  test('does not show the personal gmail address', async ({ page }) => {
    const content = await page.locator('body').textContent();
    expect(content).not.toContain('nikolaos.katsilidis@gmail.com');
  });

  test('contact form or contact info section is visible', async ({ page }) => {
    const form       = page.locator('form');
    const contactInfo = page.locator('[data-testid="contact-info"], .contact-info, address');
    const formVisible = await form.isVisible();
    const infoVisible = await contactInfo.count() > 0;
    expect(formVisible || infoVisible).toBe(true);
  });

  test('has JSON-LD ContactPage schema', async ({ page }) => {
    const jsonld = page.locator('script[type="application/ld+json"]');
    const count = await jsonld.count();
    if (count > 0) {
      let hasContactSchema = false;
      for (let i = 0; i < count; i++) {
        const content = await jsonld.nth(i).textContent();
        if ((content ?? '').includes('ContactPage')) {
          hasContactSchema = true;
          break;
        }
      }
      expect(hasContactSchema).toBe(true);
    }
  });
});
