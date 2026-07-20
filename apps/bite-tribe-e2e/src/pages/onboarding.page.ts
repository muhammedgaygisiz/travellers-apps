import { expect, Locator, Page } from '@playwright/test';

/** Smallest thing the upload accepts: it compresses a real image, not a stub. */
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Page object for the onboarding assistant shell (route: /onboarding).
 *
 * Steps are handled by whichever step component is rendered, not by their
 * position in the flow. The order and count change as the epic lands (#850), so
 * an index-based walk breaks every time a step is inserted; presence-based
 * dispatch survives it.
 *
 * Every step now has a real component: identity, visibility, currency,
 * language, location, notifications, and the finish step. The finish step
 * gathers nothing — it confirms and, on Next, writes the completion flag and
 * routes to /home (#1016).
 */
export class OnboardingPage {
  readonly page: Page;
  readonly stepCount: Locator;
  readonly finishStep: Locator;
  readonly displayNameInput: Locator;
  readonly displayNameStatus: Locator;
  readonly editPhotoButton: Locator;
  readonly photoInput: Locator;
  readonly photoPreview: Locator;
  readonly savePhotoButton: Locator;
  readonly visibilityChoice: Locator;
  readonly currencyStep: Locator;
  readonly currencyDefaultValue: Locator;
  readonly languageStep: Locator;
  readonly locationStep: Locator;
  readonly locationSkipButton: Locator;
  readonly notificationStep: Locator;
  readonly notificationSkipButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.stepCount = page.locator('.onboarding-shell__step-count');
    this.finishStep = page.locator('onboarding-finish-step');
    this.displayNameInput = page
      .getByTestId('onboarding-display-name')
      .locator('input');
    this.displayNameStatus = page.getByTestId('onboarding-display-name-status');
    this.editPhotoButton = page.getByTestId('onboarding-edit-photo');
    this.photoInput = page.getByTestId('image-file-input');
    this.photoPreview = page.locator(
      'ion-modal image-upload .image-preview img',
    );
    this.savePhotoButton = page.getByTestId('onboarding-save-photo');
    this.visibilityChoice = page.getByTestId('onboarding-visibility-choice');
    this.currencyStep = page.locator('onboarding-currency-step');
    this.currencyDefaultValue = page.getByTestId(
      'onboarding-currency-default-value',
    );
    this.languageStep = page.locator('onboarding-language-step');
    this.locationStep = page.locator('onboarding-location-step');
    this.locationSkipButton = page.getByTestId('onboarding-location-skip');
    this.notificationStep = page.locator('onboarding-notification-step');
    this.notificationSkipButton = page.getByTestId(
      'onboarding-notifications-skip',
    );
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

      await this.completeCurrentStep();
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

  private async completeCurrentStep(): Promise<void> {
    if (await this.displayNameInput.isVisible()) {
      return this.completeIdentityStep();
    }

    if (await this.visibilityChoice.isVisible()) {
      return this.completeVisibilityStep();
    }

    if (await this.currencyStep.isVisible()) {
      return this.completeCurrencyStep();
    }

    if (await this.languageStep.isVisible()) {
      return this.completeLanguageStep();
    }

    if (await this.locationStep.isVisible()) {
      return this.completeLocationStep();
    }

    if (await this.notificationStep.isVisible()) {
      return this.completeNotificationStep();
    }

    return this.completeFinishStep();
  }

  private async readProgress(): Promise<[current: number, total: number]> {
    const text = (await this.stepCount.textContent()) ?? '';
    const numbers = (text.match(/\d+/g) ?? []).map(Number);
    return [numbers[0] ?? 1, numbers[1] ?? 1];
  }

  /**
   * `ion-button` is a custom element rather than a native control, so
   * Playwright's toBeEnabled/toBeDisabled always read it as enabled and assert
   * nothing. Ionic reflects the real state onto `aria-disabled`, so match on
   * that instead. Negating the "true" match keeps this correct whether Ionic
   * renders `aria-disabled="false"` or drops the attribute entirely.
   */
  private async expectNextEnabled(): Promise<void> {
    await expect(this.nextButton).not.toHaveAttribute('aria-disabled', 'true');
  }

  private async expectNextDisabled(): Promise<void> {
    await expect(this.nextButton).toHaveAttribute('aria-disabled', 'true');
  }

  private async completeIdentityStep(): Promise<void> {
    await this.displayNameInput.fill(`E2E Foodie ${Date.now()}`);
    await expect(this.displayNameStatus).toContainText(/available/i);
    await this.expectNextEnabled();

    // The photo is optional, but adding one is what routes the profile write
    // through the upload path, so leaving it out never exercises that path. The
    // picker now lives behind the avatar's "Edit" modal, so open it, upload, and
    // wait for the preview before confirming — dismissing too early would race
    // the image processing that sets the form value.
    await this.editPhotoButton.click();
    await this.photoInput.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: ONE_PIXEL_PNG,
    });
    await expect(this.photoPreview).toBeVisible();
    await this.savePhotoButton.click();

    // A photo says nothing about the display name, so it must not undo the
    // availability the step just confirmed (#1023 follow-up).
    await this.expectNextEnabled();
  }

  private async completeVisibilityStep(): Promise<void> {
    await this.visibilityChoice
      .getByTestId('onboarding-visibility-private')
      .click();
    await this.expectNextEnabled();
  }

  /**
   * The default currency is prefilled from the device locale, so the step is
   * already satisfiable and favorites can stay empty. Asserting the prefill
   * resolved keeps the "mandatory default currency" contract covered rather than
   * blindly clicking through.
   */
  private async completeCurrencyStep(): Promise<void> {
    await expect(this.currencyDefaultValue).not.toBeEmpty();
    await this.expectNextEnabled();
  }

  /** Prefilled from the device locale, so no selection is required. */
  private async completeLanguageStep(): Promise<void> {
    await expect(this.languageStep).toBeVisible();
    await this.expectNextEnabled();
  }

  /**
   * Declines location. Skipping is an explicit "no" that needs no OS prompt,
   * which keeps the walk deterministic in a browser, and it exercises the
   * contract that a denial still lets the flow continue (#1023).
   */
  private async completeLocationStep(): Promise<void> {
    // The step must be decided before it can be left, so this also proves the
    // explanation is not silently skippable.
    await this.expectNextDisabled();
    await this.locationSkipButton.click();
    await this.expectNextEnabled();
  }

  /**
   * Declines notifications. Skipping is an explicit "no" that needs no OS
   * prompt, which keeps the walk deterministic in a browser, and it exercises
   * the contract that a denial still lets the flow continue.
   */
  private async completeNotificationStep(): Promise<void> {
    // The step must be decided before it can be left, so this also proves the
    // explanation is not silently skippable.
    await this.expectNextDisabled();
    await this.notificationSkipButton.click();
    await this.expectNextEnabled();
  }

  /**
   * The finish step gathers nothing, so it is ready to complete the moment it
   * renders. Asserting Next is enabled here keeps the "finish confirms and
   * completes without extra input" contract covered; clicking Next writes the
   * completion flag and routes to /home.
   */
  private async completeFinishStep(): Promise<void> {
    await expect(this.finishStep).toBeVisible();
    await this.expectNextEnabled();
  }
}
