import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for a BiteTrail's Bites (route: /bite-trail/:biteTrailId).
 *
 * The claim button lives in the page chrome's footer, which the page only
 * renders for a free trail — so `claimButton` doubles as the assertion that the
 * trail is claimable at all. Everything is scoped to the trail component:
 * Ionic keeps the pages we navigated from in the DOM, and Home carries a footer
 * button under the same test id.
 */
export class BiteTrailPage {
  readonly page: Page;
  readonly root: Locator;
  readonly claimButton: Locator;
  readonly savedHint: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('bite-trail-bites-page');
    this.claimButton = this.root.getByTestId('footer-add-button');
    this.savedHint = this.root.getByTestId('bite-trail-saved-hint');
  }

  /** The Bite card whose title contains the given name. */
  biteCard(name: string): Locator {
    return this.root.locator('bt-bite').filter({ hasText: name });
  }

  async expectTrail(options: {
    title: string;
    biteNames: string[];
  }): Promise<void> {
    await expect(
      this.root.getByRole('heading', { name: options.title, exact: true }),
    ).toBeVisible();

    for (const biteName of options.biteNames) {
      await expect(this.biteCard(biteName)).toBeVisible();
    }
  }

  async claimForFree(): Promise<void> {
    await expect(this.claimButton).toHaveText('Get BiteTrail for free');
    await this.claimButton.click();
    await expect(
      this.page.getByText('BiteTrail saved as bucket list!'),
    ).toBeVisible();
  }

  /**
   * Follows the toast shortcut that the claim raises. It is the only in-app way
   * to the bucket list overview from here, since the trail page has no menu.
   */
  async openBucketListsFromToast(): Promise<void> {
    await this.page
      .locator('ion-toast')
      .getByRole('button', { name: 'Go to Bucket Lists' })
      .click();
    await this.page.waitForURL(/\/my-bucketlists$/);
  }

  async openSavedBucketList(): Promise<void> {
    await expect(this.claimButton).toHaveText('Go to saved Bucket list');
    await this.claimButton.click();
    await this.page.waitForURL(/\/my-bucketlists\/[^/]+$/);
  }
}
