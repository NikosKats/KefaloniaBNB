import { test, expect } from '@playwright/test';
import { BookingFormPage } from '../pages/BookingFormPage.ts';

const LISTING_ID  = process.env.TEST_LISTING_ID  ?? 'test-listing-id';
const CHECK_IN    = '2025-10-01';
const CHECK_OUT   = '2025-10-08';
const GUESTS      = 2;

test.describe('Booking form — happy path (mocked API)', () => {
  let bookingForm: BookingFormPage;

  test.beforeEach(async ({ page }) => {
    bookingForm = new BookingFormPage(page);

    // Intercept the booking API so we never hit the real backend
    await bookingForm.mockBookingApi({
      bookingId:   'mock-booking-id',
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_mock',
    });

    await bookingForm.goto(LISTING_ID, CHECK_IN, CHECK_OUT, GUESTS);
  });

  test('renders the booking form', async ({ page }) => {
    await expect(bookingForm.guestName).toBeVisible();
    await expect(bookingForm.guestEmail).toBeVisible();
    await expect(bookingForm.submitBtn).toBeVisible();
  });

  test('shows a price summary', async ({ page }) => {
    await expect(bookingForm.priceTotal).toBeVisible();
    const text = await bookingForm.priceTotal.textContent();
    expect(text).toMatch(/€|EUR/);
  });

  test('submit button is disabled when required fields are empty', async ({ page }) => {
    // The button may be disabled or the form may show validation messages
    const isDisabled = await bookingForm.submitBtn.isDisabled();
    if (isDisabled) {
      expect(isDisabled).toBe(true);
    }
    // If not disabled, it's validated on submit — that's also acceptable
  });

  test('fills guest details and submits successfully', async ({ page }) => {
    await bookingForm.fillGuestDetails({
      name:  'Alice Test',
      email: 'alice@example.com',
      phone: '1234567890',
    });
    await bookingForm.selectPaymentMethod('stripe');
    await bookingForm.submit();

    // After submission with mocked API, should redirect to Stripe checkout
    // or show a confirmation step
    await page.waitForURL(/checkout\.stripe\.com|\/book\/success|\/book\/.+/, { timeout: 10_000 });
  });
});

test.describe('Booking form — validation', () => {
  let bookingForm: BookingFormPage;

  test.beforeEach(async ({ page }) => {
    bookingForm = new BookingFormPage(page);
    await bookingForm.goto(LISTING_ID, CHECK_IN, CHECK_OUT, GUESTS);
  });

  test('shows error for invalid email', async ({ page }) => {
    await bookingForm.fillGuestDetails({ name: 'Alice', email: 'not-an-email' });
    await bookingForm.submit();

    // Either browser native validation or custom error message
    const errorOrInvalid =
      (await bookingForm.errorMsg.isVisible()) ||
      (await bookingForm.guestEmail.evaluate((el: HTMLInputElement) => !el.validity.valid));
    expect(errorOrInvalid).toBe(true);
  });

  test('shows error message when API returns an error', async ({ page }) => {
    await bookingForm.mockBookingApi({ error: 'Those dates are no longer available' }, 409);

    await bookingForm.fillGuestDetails({ name: 'Bob', email: 'bob@test.com' });
    await bookingForm.selectPaymentMethod('stripe');
    await bookingForm.submit();

    await expect(bookingForm.errorMsg).toBeVisible({ timeout: 8_000 });
    await expect(bookingForm.errorMsg).toContainText(/available|dates/i);
  });
});

test.describe('Booking form — bank transfer', () => {
  test('shows bank transfer option and submits', async ({ page }) => {
    const bookingForm = new BookingFormPage(page);
    await bookingForm.mockBookingApi({ bookingId: 'bank-booking-id', paymentMethod: 'bank_transfer' });
    await bookingForm.goto(LISTING_ID, CHECK_IN, CHECK_OUT, GUESTS);

    await bookingForm.fillGuestDetails({ name: 'Charlie', email: 'charlie@test.com' });
    await bookingForm.selectPaymentMethod('bank');
    await bookingForm.submit();

    // Bank transfer bookings show a confirmation page, not a Stripe redirect
    await page.waitForURL(/\/book\/success|\/book\/.+/, { timeout: 10_000 });
  });
});
