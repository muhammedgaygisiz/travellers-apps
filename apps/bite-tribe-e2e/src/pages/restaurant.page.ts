import { expect, Locator, Page } from '@playwright/test';

/** Page object for verified restaurant and unverified Bite-place pages. */
export class RestaurantPage {
  readonly page: Page;
  readonly verified: Locator;
  readonly unverified: Locator;

  constructor(page: Page) {
    this.page = page;
    this.verified = page.locator('restaurant:visible');
    this.unverified = page.locator('bite-place:visible');
  }

  async expectVerifiedRestaurant(options: {
    name: string;
    description: string;
    street: string;
    cityLine: string;
    country: string;
    rating: string;
    ratingCount: number;
    tags: string[];
  }): Promise<void> {
    await expect(
      this.verified.getByRole('heading', { name: options.name, exact: true }),
    ).toBeVisible();
    await expect(
      this.verified.getByText(options.description, { exact: true }),
    ).toBeVisible();
    await expect(
      this.verified.getByText(options.street, { exact: true }),
    ).toBeVisible();
    await expect(this.verified).toContainText(options.cityLine);
    await expect(
      this.verified.getByText(options.country, { exact: true }),
    ).toBeVisible();
    await expect(this.verified.locator('.rating')).toHaveText(options.rating);
    await expect(this.verified).toContainText(
      `(${options.ratingCount} ratings)`,
    );
    await expect(
      this.verified.getByRole('heading', {
        name: 'Opening Hours',
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.verified).toContainText('11:30–22:00');
    await expect(this.verified.locator('.leaflet-marker-icon')).toBeVisible();

    for (const tag of options.tags) {
      await expect(
        this.verified.locator('bt-tags-input').getByText(tag, { exact: true }),
      ).toBeVisible();
    }
  }

  async expectUnverifiedPlace(options: {
    name: string;
    rating: string;
    ratingCount: number;
    tags: string[];
  }): Promise<void> {
    await expect(
      this.unverified.getByRole('heading', {
        name: options.name,
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.unverified).toContainText(
      'This restaurant is not verified on BiteTribe yet.',
    );
    await expect(this.unverified.locator('.rating')).toHaveText(options.rating);
    await expect(this.unverified).toContainText(
      `(${options.ratingCount} ratings)`,
    );
    await expect(this.unverified.locator('.leaflet-marker-icon')).toBeVisible();

    for (const tag of options.tags) {
      await expect(
        this.unverified
          .locator('bt-tags-input')
          .getByText(tag, { exact: true }),
      ).toBeVisible();
    }
  }

  async openBites(): Promise<void> {
    const activePage = this.verified.or(this.unverified);
    await activePage
      .getByRole('button', { name: 'Bites', exact: true })
      .click();
    await this.page.waitForURL(/\/bite\/[^/]+\/restaurant\/[^/]+\/bites$/);
  }
}
