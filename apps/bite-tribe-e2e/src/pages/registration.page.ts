import { Locator, Page } from '@playwright/test';

/**
 * Page object for the registration screen (route: /registration).
 *
 * Ionic's `ion-input` renders a native `<input>` inside its shadow root, so the
 * test ids resolve to the host and we drill into the inner input. Playwright
 * pierces open shadow DOM automatically.
 */
export class RegistrationPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly passwordConfirm: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByTestId('email').locator('input');
    this.password = page.getByTestId('password').locator('input');
    this.passwordConfirm = page
      .getByTestId('password-confirm')
      .locator('input');
    this.submit = page.getByTestId('submit');
  }

  async goto(): Promise<void> {
    await this.page.goto('/registration');
  }

  async register(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.passwordConfirm.fill(password);
    await this.submit.click();
  }
}
