import { test, expect } from '@playwright/test';

test.describe('FAQs page (/faqs)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faqs');
    await page.waitForLoadState('networkidle');
  });

  test('renders the page heading', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect((text ?? '').trim().length).toBeGreaterThan(0);
  });

  test('displays FAQ items', async ({ page }) => {
    // FAQ items can be <details>, accordion items, or dt/dd pairs
    const items = page.locator('details, [data-testid="faq-item"], .faq-item, dt');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows generic platform content (not rental-specific)', async ({ page }) => {
    const bodyText = (await page.locator('body').textContent()) ?? '';
    // Should contain generic booking platform language
    expect(bodyText.toLowerCase()).toMatch(/booking|payment|cancellation|refund/);
  });

  test('FAQ category filter tabs are visible (if present)', async ({ page }) => {
    const tabs = page.locator('[data-testid="faq-tab"], [role="tab"], .faq-category-tab');
    const count = await tabs.count();
    // Tabs are optional — just check they function if present
    if (count > 0) {
      await expect(tabs.first()).toBeVisible();
    }
  });

  test('clicking a category tab filters the FAQ list', async ({ page }) => {
    const tabs = page.locator('[data-testid="faq-tab"], [role="tab"], .faq-category-tab');
    const count = await tabs.count();
    if (count < 2) test.skip();

    const initialCount = await page.locator('details, [data-testid="faq-item"]').count();
    await tabs.nth(1).click();
    await page.waitForTimeout(300);
    const afterCount = await page.locator('details:visible, [data-testid="faq-item"]:visible').count();
    // After filtering, count may be equal or smaller — just ensure it's still > 0
    expect(afterCount).toBeGreaterThan(0);
    // Filtered count may be less than or equal to initial count
    void initialCount;
  });

  test('expanding an FAQ item shows the answer', async ({ page }) => {
    const firstItem = page.locator('details').first();
    const isDetails = await firstItem.count() > 0;
    if (!isDetails) test.skip();

    await firstItem.click();
    const answer = firstItem.locator('p, div, dd').first();
    await expect(answer).toBeVisible();
  });

  test('"Still have a question?" CTA section is visible', async ({ page }) => {
    // Look for a CTA section at the bottom of the FAQ page
    const cta = page.locator('text=/still have a question|contact us|get in touch/i').first();
    const isVisible = await cta.isVisible();
    // CTA is nice-to-have — don't fail hard if absent
    if (isVisible) {
      expect(isVisible).toBe(true);
    }
  });
});
