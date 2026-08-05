import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for a Restaurant menu
 * (route: `bite/:biteId/restaurant/:restaurantId/menu/:menuId`).
 */
export class MenuPage {
  readonly page: Page;
  readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('menu-page:visible');
  }

  /** The menu item card carrying the given dish name. */
  item(name: string): Locator {
    return this.root.locator('menu-item').filter({ hasText: name });
  }

  async expectItem(name: string): Promise<void> {
    await expect(
      this.item(name).getByRole('heading', { name, exact: true }),
    ).toBeVisible();
  }

  /** Starts a Bite from the named menu item and waits for the prefilled form. */
  async createBiteFrom(name: string): Promise<void> {
    await this.item(name)
      .locator('ion-button')
      .filter({ hasText: 'Create Bite' })
      .click();
    await this.page.waitForURL('**/new-bite');
  }
}
