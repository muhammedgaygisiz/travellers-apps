import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the temporary onboarding placeholder (route: /onboarding).
 */
export class OnboardingPage {
  readonly page: Page;
  readonly dismissButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dismissButton = page.getByTestId('dismiss-onboarding');
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/onboarding$/);
    await expect(this.dismissButton).toBeVisible();
  }

  async dismiss(): Promise<void> {
    await this.dismissButton.click();
    await this.page.waitForURL('**/home');
  }
}
