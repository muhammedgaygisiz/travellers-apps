import { Locator, Page } from '@playwright/test';

/**
 * Page object for the login screen (route: /login).
 *
 * Ionic's `ion-input` renders a native `<input>` inside its shadow root, so the
 * test ids resolve to the host element and we drill into the inner input to type.
 * Playwright pierces open shadow DOM automatically.
 */
export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly signup: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByTestId('email').locator('input');
    this.password = page.getByTestId('password').locator('input');
    this.submit = page.getByTestId('submit');
    this.signup = page.getByTestId('signup');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
