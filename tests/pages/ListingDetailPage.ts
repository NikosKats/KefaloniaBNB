import type { Page, Locator } from '@playwright/test';

export class ListingDetailPage {
  readonly page: Page;
  readonly gallery: Locator;
  readonly galleryCover: Locator;
  readonly calendar: Locator;
  readonly amenitiesSection: Locator;
  readonly bookingWidget: Locator;
  readonly bookingCta: Locator;
  readonly priceTotal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.gallery          = page.locator('[data-testid="availability-calendar"]');
    this.galleryCover     = page.locator('[data-testid="gallery-cover"]');
    this.calendar         = page.locator('[data-testid="availability-calendar"]');
    this.amenitiesSection = page.locator('[data-testid="amenities-grid"]').or(page.locator('text=Amenities')).first();
    this.bookingWidget    = page.locator('[data-testid="booking-widget"]').or(page.locator('form').first());
    this.bookingCta       = page.locator('[data-testid="booking-cta"]');
    this.priceTotal       = page.locator('[data-testid="booking-price-total"]');
  }

  async goto(slug: string) {
    await this.page.goto(`/villas/${slug}`);
    await this.page.waitForLoadState('networkidle');
  }

  async setDates(checkIn: string, checkOut: string) {
    await this.page.goto(this.page.url() + `?check_in=${checkIn}&check_out=${checkOut}`);
    await this.page.waitForLoadState('networkidle');
  }

  async clickBookNow() {
    await this.bookingCta.click();
  }
}
