import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the in-app account deletion screen
 * (route: /settings/delete-account).
 *
 * The page states the deletion contract and the destructive confirmation lives
 * in an `ion-alert`, which Ionic appends to the document body rather than to
 * the component, so the alert buttons are addressed from the page.
 */
export class DeleteAccountPage {
  readonly page: Page;
  readonly root: Locator;
  readonly warning: Locator;
  readonly removedList: Locator;
  readonly keptList: Locator;
  readonly submitButton: Locator;
  readonly error: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('delete-my-account');
    this.warning = this.root.getByTestId('delete-account-warning');
    this.removedList = this.root.getByTestId('delete-account-removed');
    this.keptList = this.root.getByTestId('delete-account-kept');
    this.submitButton = this.root.getByTestId('delete-account-submit');
    this.error = this.root.getByTestId('delete-account-error');
    this.alert = page.locator('ion-alert:visible');
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  /**
   * The acceptance criterion is that the contract names each category, so both
   * lists must actually be on screen before the destructive action is offered.
   */
  async expectContractVisible(): Promise<void> {
    await expect(this.warning).toBeVisible();
    await expect(this.removedList).toBeVisible();
    await expect(this.keptList).toBeVisible();
  }

  async confirmDeletion(): Promise<void> {
    await this.submitButton.click();

    await expect(this.alert).toBeVisible();
    await this.alert
      .getByRole('button', { name: 'Delete account', exact: true })
      .click();
  }

  async cancelDeletion(): Promise<void> {
    await this.submitButton.click();

    await expect(this.alert).toBeVisible();
    await this.alert
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(this.alert).toHaveCount(0);
  }
}
