import { expect, Locator, Page } from '@playwright/test';

export class BiteDetailsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly editButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('details-page');
    this.editButton = this.root
      .locator('ion-button')
      .filter({ hasText: 'Edit Bite' });
  }

  async expectBite(options: {
    name: string;
    restaurant: string;
    description: string;
    tags: string[];
    rating: number;
  }): Promise<void> {
    await expect(
      this.root.getByRole('heading', { name: options.name }),
    ).toBeVisible();
    await expect(
      this.root.getByText(options.restaurant, { exact: true }),
    ).toBeVisible();
    await expect(
      this.root.getByText(options.description, { exact: true }),
    ).toBeVisible();

    for (const tag of options.tags) {
      await expect(
        this.root.locator('bt-tags-input').getByText(tag, { exact: true }),
      ).toBeVisible();
    }

    await expect(
      this.root
        .locator('star-rating[readonly]')
        .locator(`[aria-label="${options.rating} star"]`),
    ).toHaveAttribute('aria-checked', 'true');
  }

  async openEdit(): Promise<void> {
    await this.editButton.scrollIntoViewIfNeeded();
    await this.editButton.dispatchEvent('click');
    await this.page.waitForURL(/\/bite\/[^/]+\/edit$/);
  }
}
