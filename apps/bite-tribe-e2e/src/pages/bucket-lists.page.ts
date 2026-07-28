import { expect, Locator, Page } from '@playwright/test';
import { navigateFromAppMenu } from '../support/app-menu';

/**
 * Page object for the bucket list overview (route: /my-bucketlists).
 *
 * The rating action only exists on a list that came from a BiteTrail, so its
 * presence is itself part of what the marketplace journey proves. Locators are
 * scoped to the component, because Ionic leaves every page we navigated from in
 * the DOM and each of those carries its own back button.
 */
export class BucketListsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly items: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('bucketlists-page');
    this.items = this.root.getByTestId('bucketlist-item');
    this.backButton = this.root.locator('ion-back-button');
  }

  async open(): Promise<void> {
    await navigateFromAppMenu(this.page, 'my-bucketlists');
  }

  item(name: string): Locator {
    return this.items.filter({ hasText: name });
  }

  async expectList(options: {
    name: string;
    biteCount: number;
  }): Promise<void> {
    const item = this.item(options.name);

    await expect(item).toBeVisible();
    await expect(item.locator('ion-badge')).toHaveText(
      String(options.biteCount),
    );
  }

  async openRating(name: string): Promise<void> {
    await this.item(name).getByTestId('bucketlist-rate').click();
    await this.page.waitForURL(/\/my-bucketlists\/[^/]+\/rate$/);
  }

  async openDetails(name: string): Promise<void> {
    await this.item(name).click();
    await this.page.waitForURL(/\/my-bucketlists\/[^/]+$/);
  }
}
