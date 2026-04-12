import type { Page, Locator } from '@playwright/test';

export class AdminBookingsPage {
  readonly page: Page;
  readonly bookingRows: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    this.page         = page;
    this.bookingRows  = page.locator('[data-testid="booking-row"]').or(page.locator('table tbody tr'));
    this.searchInput  = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    this.statusFilter = page.locator('select[name="status"]').first();
  }

  async goto() {
    await this.page.goto('/admin/bookings');
    await this.page.waitForLoadState('networkidle');
  }

  async openBooking(id: string) {
    await this.page.goto(`/admin/bookings/${id}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getRowCount(): Promise<number> {
    return this.bookingRows.count();
  }
}
