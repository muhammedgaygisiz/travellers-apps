import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for rating the BiteTrail behind a bucket list
 * (route: /my-bucketlists/:bucketlistId/rate).
 */
export class RateBiteTrailPage {
  readonly page: Page;
  readonly root: Locator;
  readonly review: Locator;
  readonly submitButton: Locator;
  readonly existingRatingNotice: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('rate-bucketlist-page');
    this.review = this.root
      .locator('ion-textarea[formcontrolname="review"]')
      .locator('textarea');
    this.submitButton = this.root.getByTestId('rate-bucketlist-submit');
    this.existingRatingNotice = this.root.getByTestId(
      'rate-bucketlist-existing',
    );
  }

  star(rating: number): Locator {
    return this.root.locator(`star-rating [aria-label="${rating} star"]`);
  }

  async expectTitle(bucketListName: string): Promise<void> {
    await expect(
      this.root.getByRole('heading', { name: bucketListName, exact: true }),
    ).toBeVisible();
  }

  /**
   * Submitting navigates back to the overview. Both fields are required, so the
   * button stays disabled until the rating and the review are filled in.
   *
   * `ion-button` is not a native control, so Playwright's toBeEnabled/toBeDisabled
   * always read it as enabled; `aria-disabled` is what Ionic actually flips.
   */
  async submitRating(rating: number, review: string): Promise<void> {
    await this.star(rating).click();
    await this.review.fill(review);
    await expect(this.submitButton).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await this.submitButton.click();
    await this.page.waitForURL(/\/my-bucketlists$/);
  }

  /** The read-only state a second visit lands in: one rating per user, ever. */
  async expectAlreadyRated(rating: number): Promise<void> {
    await expect(this.existingRatingNotice).toContainText(
      'You already rated this Bite Trail.',
    );
    await expect(this.star(rating)).toHaveAttribute('aria-checked', 'true');
    await expect(this.submitButton).toHaveAttribute('aria-disabled', 'true');
  }
}
