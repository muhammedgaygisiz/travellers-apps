import { expect, Locator, Page } from '@playwright/test';

export class BiteDetailsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly editButton: Locator;
  readonly shareButton: Locator;
  readonly navigationButton: Locator;
  readonly bucketListButton: Locator;
  readonly review: Locator;
  readonly submitReviewButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('details-page');
    this.editButton = this.root
      .locator('ion-button')
      .filter({ hasText: 'Edit Bite' });
    this.shareButton = this.root.getByTestId('bite-details-share');
    this.navigationButton = this.root.getByTestId('bite-details-navigation');
    this.bucketListButton = this.root.getByTestId('bite-details-bucket-list');
    this.review = this.root
      .locator('ion-textarea[formcontrolname="review"]')
      .locator('textarea');
    this.submitReviewButton = this.root.getByRole('button', {
      name: 'Add your review',
    });
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

  async submitReview(review: string): Promise<void> {
    await this.review.fill(review);
    await this.submitReviewButton.click();
    await expect(this.root.getByText(review, { exact: true })).toBeVisible();
  }

  async saveToBucketList(bucketListName: string): Promise<void> {
    await this.bucketListButton.click();
    await this.page
      .locator('ion-popover.bucket-list-popover ion-item')
      .filter({ hasText: bucketListName })
      .click();
  }
}
