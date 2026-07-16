import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the onboarding assistant shell (route: /onboarding).
 *
 * The assistant renders its steps in order. Identity and visibility now have
 * real inputs, while later steps still use the placeholder acknowledgement
 * until their follow-up issues land.
 */
export class OnboardingPage {
  readonly page: Page;
  readonly stepCount: Locator;
  readonly acknowledgeCheckbox: Locator;
  readonly displayNameInput: Locator;
  readonly displayNameStatus: Locator;
  readonly visibilityChoice: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.stepCount = page.locator('.onboarding-shell__step-count');
    this.acknowledgeCheckbox = page.getByTestId('onboarding-acknowledge');
    this.displayNameInput = page
      .getByTestId('onboarding-display-name')
      .locator('input');
    this.displayNameStatus = page.getByTestId('onboarding-display-name-status');
    this.visibilityChoice = page.getByTestId('onboarding-visibility-choice');
    this.nextButton = page.getByTestId('onboarding-next');
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/onboarding$/);
    await expect(this.nextButton).toBeVisible();
  }

  /**
   * Walks the assistant from the current step to the end. Finishing the last
   * step navigates to /home.
   */
  async complete(): Promise<void> {
    await this.expectVisible();

    for (;;) {
      const [current, total] = await this.readProgress();

      if (current === 1) {
        await this.completeIdentityStep();
      } else if (current === 2) {
        await this.completeVisibilityStep();
      } else {
        // Only act once the freshly rendered step is unacknowledged, so we never
        // click a checkbox that is still bound to the previous step.
        await this.waitForAcknowledged(false);
        await this.acknowledgeCheckbox.click();
      }

      await this.nextButton.click();

      if (current >= total) {
        await this.page.waitForURL('**/home');
        return;
      }

      // Wait for the shell to advance before handling the next step.
      await expect
        .poll(async () => (await this.readProgress())[0])
        .toBeGreaterThan(current);
    }
  }

  private async readProgress(): Promise<[current: number, total: number]> {
    const text = (await this.stepCount.textContent()) ?? '';
    const numbers = (text.match(/\d+/g) ?? []).map(Number);
    return [numbers[0] ?? 1, numbers[1] ?? 1];
  }

  private async completeIdentityStep(): Promise<void> {
    await this.displayNameInput.fill(`E2E Foodie ${Date.now()}`);
    await expect(this.displayNameStatus).toContainText(/available/i);
    await expect(this.nextButton).toBeEnabled();
  }

  private async completeVisibilityStep(): Promise<void> {
    await this.visibilityChoice
      .getByTestId('onboarding-visibility-private')
      .click();
    await expect(this.nextButton).toBeEnabled();
  }

  private async waitForAcknowledged(expected: boolean): Promise<void> {
    await expect
      .poll(() =>
        this.acknowledgeCheckbox.evaluate(
          (el) => (el as unknown as { checked: boolean }).checked,
        ),
      )
      .toBe(expected);
  }
}
