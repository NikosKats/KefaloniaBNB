import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly listingCards: Locator;
  readonly heroTitle: Locator;
  readonly navLogo: Locator;
  readonly navBookCta: Locator;

  constructor(page: Page) {
    this.page = page;
    this.listingCards = page.locator('[data-testid="listing-card"]');
    this.heroTitle    = page.locator('h1').first();
    this.navLogo      = page.locator('[data-testid="nav-logo"]');
    this.navBookCta   = page.locator('[data-testid="nav-book-cta"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async getListingCount(): Promise<number> {
    return this.listingCards.count();
  }

  async clickFirstListing() {
    await this.listingCards.first().locator('[data-testid="listing-card-link"]').click();
  }

  async switchLanguage(code: 'en' | 'el' | 'bg' | 'ro' | 'tr') {
    await this.page.goto(`/?lang=${code}`);
    await this.page.waitForLoadState('networkidle');
  }
}
