import { expect, Locator, Page } from '@playwright/test';

/** Page object for the business dashboard (route: /dashboard). */
export class DashboardPage {
  readonly page: Page;
  readonly restaurants: Locator;

  constructor(page: Page) {
    this.page = page;
    this.restaurants = page.getByTestId('dashboard-restaurants');
  }

  /**
   * Matches the `ion-item` rather than the `<button>` Ionic renders inside its
   * shadow root: the label is slotted light DOM, so a shadow-root button has no
   * text of its own to filter on.
   */
  restaurant(name: string): Locator {
    return this.restaurants.getByRole('listitem').filter({ hasText: name });
  }

  /**
   * The restaurants card is filled by a Firestore collection read that starts
   * after the shell has booted, so give it more than the default expect timeout.
   */
  async expectRestaurant(name: string): Promise<void> {
    await expect(this.restaurant(name)).toBeVisible({ timeout: 20_000 });
  }

  async openRestaurant(name: string, restaurantId: string): Promise<void> {
    await this.restaurant(name).click();
    await this.page.waitForURL(`**/restaurant/${restaurantId}`);
  }
}
