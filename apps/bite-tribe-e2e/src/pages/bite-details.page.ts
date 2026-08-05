import { expect, Locator, Page } from '@playwright/test';

export class BiteDetailsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly editButton: Locator;
  readonly shareButton: Locator;
  readonly navigationButton: Locator;
  readonly bucketListButton: Locator;
  readonly bucketListPopoverItems: Locator;
  readonly newBucketListItem: Locator;
  readonly newBucketListAlert: Locator;
  readonly review: Locator;
  readonly submitReviewButton: Locator;
  readonly imageStatus: Locator;
  readonly image: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('details-page');
    // Both overlays are appended to the document body, so they are looked up
    // from the page rather than from within the details component.
    this.bucketListPopoverItems = page.locator(
      'ion-popover.bucket-list-popover ion-item',
    );
    this.newBucketListItem = this.bucketListPopoverItems.filter({
      hasText: 'New Bucket list',
    });
    // Scoped by its own class: pages the app has already rendered leave their
    // inline `ion-alert` elements in the DOM, so the bare tag is ambiguous.
    this.newBucketListAlert = page.locator('ion-alert.new-bucket-list-alert');
    // The header photo and the placeholder that replaces it while the upload is
    // pending or after it failed — the same component the feed card renders.
    this.imageStatus = this.root.locator('bt-bite-image-status');
    this.image = this.root.locator('img.dish-image');
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
    await this.bucketListPopoverItems
      .filter({ hasText: bucketListName })
      .click();
  }

  /**
   * Closes the bucket list popover without selecting anything, and waits until
   * Ionic has taken it back out of the DOM — its backdrop would otherwise keep
   * swallowing clicks on the page underneath.
   */
  async dismissBucketListPopover(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(
      this.page.locator('ion-popover.bucket-list-popover'),
    ).toHaveCount(0);
  }

  /** True once the Bite belongs to at least one bucket list. */
  async expectBucketListMembership(isMember: boolean): Promise<void> {
    await expect(this.bucketListButton).toHaveAttribute(
      'name',
      isMember ? 'bookmark' : 'bookmark-outline',
    );
  }

  /**
   * Opens the name prompt for a brand new list.
   *
   * The popover is created with `dismissOnSelect`, so this same tap dismisses
   * it; the prompt belongs to the details page and outlives it. See GitHub
   * issue #1231.
   */
  async openNewBucketListPrompt(): Promise<void> {
    await this.newBucketListItem.click();
    await expect(this.newBucketListAlert).toBeVisible();
  }

  async submitNewBucketListName(name: string): Promise<void> {
    await this.newBucketListAlert.locator('input').fill(name);
    await this.newBucketListAlert.getByRole('button', { name: 'Save' }).click();
  }
}
