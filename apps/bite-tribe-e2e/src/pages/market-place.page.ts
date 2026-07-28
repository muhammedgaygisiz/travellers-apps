import { expect, Locator, Page } from '@playwright/test';
import { navigateFromAppMenu } from '../support/app-menu';

/**
 * Page object for the market place (route: /market-place).
 *
 * The page lists every BiteTrail in the collection, including the ones from the
 * emulator export, so a card is always addressed by its (unique) trail name.
 */
export class MarketPlacePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(): Promise<void> {
    await navigateFromAppMenu(this.page, 'market-place');
  }

  /** The BiteTrail card whose title contains the given name. */
  trailCard(name: string): Locator {
    return this.page.locator('bite-trail').filter({ hasText: name });
  }

  async expectFreeTrail(options: {
    name: string;
    owner: string;
    location: string;
    biteCount: number;
    description: string;
  }): Promise<void> {
    const card = this.trailCard(options.name);

    await expect(card).toBeVisible();
    await expect(card).toContainText(`@${options.owner}`);
    await expect(card).toContainText(options.location);
    await expect(card).toContainText(`${options.biteCount} Bites`);
    await expect(card).toContainText(options.description);
    // A price of 0 is what makes the trail claimable without a purchase, and
    // the card says so instead of showing a currency and an amount.
    await expect(card).toContainText('Free');
  }

  async openTrail(name: string): Promise<void> {
    await this.trailCard(name).getByTestId('bite-trail-view').click();
    await this.page.waitForURL(/\/bite-trail\/[^/]+$/);
  }
}
