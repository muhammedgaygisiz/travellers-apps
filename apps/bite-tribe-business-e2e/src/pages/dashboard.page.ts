import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the business dashboard (route: `/dashboard`) and the section
 * pages it lists.
 *
 * The dashboard itself shows the map and one entry per section since issue
 * #1473; the restaurants live on `/restaurants`.
 */
export class DashboardPage {
  readonly page: Page;
  readonly sections: Locator;
  readonly restaurants: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sections = page.getByTestId('dashboard-sections');
    this.restaurants = page.getByTestId('dashboard-restaurants');
  }

  /** Opens the restaurants section from the dashboard's entry list. */
  async openRestaurants(): Promise<void> {
    await this.sections
      .getByTestId('dashboard-section-restaurants')
      .click({ timeout: 20_000 });
    await this.page.waitForURL('**/restaurants');
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
   * The restaurants list is filled by a Firestore collection read that starts
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
