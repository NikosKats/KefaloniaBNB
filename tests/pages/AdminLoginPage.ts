import type { Page, Locator } from '@playwright/test';

export class AdminLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly errorMsg: Locator;

  constructor(page: Page) {
    this.page          = page;
    this.emailInput    = page.locator('[data-testid="login-email"]');
    this.passwordInput = page.locator('[data-testid="login-password"]');
    this.submitBtn     = page.locator('[data-testid="login-submit"]');
    this.errorMsg      = page.locator('[data-testid="login-error"]');
  }

  async goto() {
    await this.page.goto('/admin/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }

  async loginAsAdmin() {
    await this.goto();
    await this.login(
      process.env.TEST_ADMIN_EMAIL ?? 'admin@kefaloniabnb.com',
      process.env.TEST_ADMIN_PASSWORD ?? 'test-password'
    );
    await this.page.waitForURL('**/admin', { timeout: 10_000 });
  }
}
