import type { Page, Locator } from '@playwright/test';

export class BookingFormPage {
  readonly page: Page;
  readonly guestName: Locator;
  readonly guestEmail: Locator;
  readonly dialCode: Locator;
  readonly phoneNumber: Locator;
  readonly payStripe: Locator;
  readonly payBank: Locator;
  readonly planFull: Locator;
  readonly planDeposit: Locator;
  readonly submitBtn: Locator;
  readonly errorMsg: Locator;
  readonly priceTotal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.guestName   = page.locator('[data-testid="book-guest-name"]');
    this.guestEmail  = page.locator('[data-testid="book-guest-email"]');
    this.dialCode    = page.locator('[data-testid="book-dial-code"]');
    this.phoneNumber = page.locator('[data-testid="book-phone-number"]');
    this.payStripe   = page.locator('[data-testid="book-pay-stripe"]');
    this.payBank     = page.locator('[data-testid="book-pay-bank"]');
    this.planFull    = page.locator('[data-testid="book-plan-full"]');
    this.planDeposit = page.locator('[data-testid="book-plan-deposit"]');
    this.submitBtn   = page.locator('[data-testid="book-submit"]');
    this.errorMsg    = page.locator('[data-testid="book-error"]');
    this.priceTotal  = page.locator('[data-testid="book-price-total"]');
  }

  async goto(listingId: string, checkIn: string, checkOut: string, guests = 2) {
    await this.page.goto(
      `/book/${listingId}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`
    );
    await this.page.waitForLoadState('networkidle');
  }

  async fillGuestDetails(opts: {
    name: string;
    email: string;
    phone?: string;
  }) {
    await this.guestName.fill(opts.name);
    await this.guestEmail.fill(opts.email);
    if (opts.phone) {
      await this.phoneNumber.fill(opts.phone);
    }
  }

  async selectPaymentMethod(method: 'stripe' | 'bank') {
    if (method === 'stripe') {
      await this.payStripe.click();
    } else {
      await this.payBank.click();
    }
  }

  async selectPaymentPlan(plan: 'full' | 'deposit') {
    if (plan === 'full') {
      await this.planFull.click();
    } else {
      await this.planDeposit.click();
    }
  }

  async submit() {
    await this.submitBtn.click();
  }

  /** Intercept the booking API call and return the mocked response */
  async mockBookingApi(responseBody: Record<string, unknown>, status = 200) {
    await this.page.route('**/api/bookings/create', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      })
    );
  }
}
