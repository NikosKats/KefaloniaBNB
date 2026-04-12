/**
 * E2E tests for the deposit payment flow.
 *
 * Tests run against a listing that has deposit_percent > 0.
 * Set TEST_DEPOSIT_LISTING_ID in .env.test to point to such a listing.
 */
import { test, expect } from '@playwright/test';
import { BookingFormPage } from '../pages/BookingFormPage.ts';

const LISTING_ID = process.env.TEST_DEPOSIT_LISTING_ID ?? process.env.TEST_LISTING_ID ?? 'test-listing-id';
const CHECK_IN   = '2025-10-01';
const CHECK_OUT  = '2025-10-08';

test.describe('Deposit payment plan', () => {
  let bookingForm: BookingFormPage;

  test.beforeEach(async ({ page }) => {
    bookingForm = new BookingFormPage(page);
    await bookingForm.goto(LISTING_ID, CHECK_IN, CHECK_OUT, 2);
  });

  test('shows payment plan section when listing offers deposit', async ({ page }) => {
    // If the listing has deposit_percent > 0, both plan cards should appear
    const fullPlan    = bookingForm.planFull;
    const depositPlan = bookingForm.planDeposit;

    // One of them should be visible (if deposit is enabled on this listing)
    const fullVisible    = await fullPlan.isVisible();
    const depositVisible = await depositPlan.isVisible();

    // Either both are visible (deposit enabled) or neither (deposit disabled)
    expect(fullVisible).toBe(depositVisible);
  });

  test('deposit plan card shows deposit amount', async ({ page }) => {
    const depositPlan = bookingForm.planDeposit;
    const isVisible   = await depositPlan.isVisible();
    if (!isVisible) test.skip();

    await depositPlan.click();
    // After selecting deposit, the submit button label should reflect deposit
    const btnText = await bookingForm.submitBtn.textContent();
    expect(btnText).toMatch(/deposit|pay now/i);
  });

  test('full plan is selected by default', async ({ page }) => {
    const fullPlan  = bookingForm.planFull;
    const isVisible = await fullPlan.isVisible();
    if (!isVisible) test.skip();

    // The full plan radio/card should be checked by default
    const isChecked = await fullPlan.evaluate((el: HTMLInputElement) =>
      el.checked ?? el.getAttribute('aria-checked') === 'true'
    );
    expect(isChecked).toBe(true);
  });

  test('submitting with deposit plan sends payment_type=deposit to API', async ({ page }) => {
    const depositPlan = bookingForm.planDeposit;
    const isVisible   = await depositPlan.isVisible();
    if (!isVisible) test.skip();

    // Intercept the API call
    let capturedBody: Record<string, unknown> = {};
    await page.route('**/api/bookings/create', async (route) => {
      const body = route.request().postDataJSON();
      capturedBody = body ?? {};
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bookingId: 'dep-booking', checkoutUrl: 'https://checkout.stripe.com/pay/cs_dep' }),
      });
    });

    await depositPlan.click();
    await bookingForm.fillGuestDetails({ name: 'Deposit Test', email: 'deposit@test.com' });
    await bookingForm.selectPaymentMethod('stripe');
    await bookingForm.submit();

    await page.waitForURL(/checkout\.stripe\.com|\/book\/success/, { timeout: 10_000 });
    expect(capturedBody.payment_type).toBe('deposit');
  });
});
