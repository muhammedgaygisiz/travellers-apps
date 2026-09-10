import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the business dashboard (route: `/dashboard`) and the section
 * pages it lists.
 *
 * The dashboard itself shows the map and one entry per section since issue
 * #1473; the restaurants live on `/restaurants`.
 *
 * That list holds exactly the restaurants assigned to the signed-in account
 * since issue #1079, so both an absent row and the empty state are assertable
 * outcomes rather than signs of a failed read.
 */
export class DashboardPage {
  readonly page: Page;
  readonly sections: Locator;
  readonly restaurants: Locator;
  readonly noRestaurants: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sections = page.getByTestId('dashboard-sections');
    this.restaurants = page.getByTestId('dashboard-restaurants');
    this.noRestaurants = page.getByTestId('no-restaurants');
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

  /**
   * Waits for the empty state before judging the row absent. Asserting the
   * row's absence alone passes while the collection read is still in flight,
   * which is every run's first second - so it would pass with the ownership
   * filter removed.
   */
  async expectRestaurantMissing(name: string): Promise<void> {
    await this.expectEmptyState();
    await expect(this.restaurant(name)).toHaveCount(0);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.noRestaurants).toBeVisible({ timeout: 20_000 });
  }

  async openRestaurant(name: string, restaurantId: string): Promise<void> {
    await this.restaurant(name).click();
    await this.page.waitForURL(`**/restaurant/${restaurantId}`);
  }
}
