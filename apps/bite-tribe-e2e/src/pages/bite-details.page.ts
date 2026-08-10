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
  readonly reviewThreads: Locator;
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
    // The composer at the foot of the compartment, which starts a new thread. A
    // reply composer inside a thread carries the same form control name, so this
    // is scoped by test id rather than by control (issue #1283).
    this.review = this.root.getByTestId('new-review-input').locator('textarea');
    this.submitReviewButton = this.root.getByRole('button', {
      name: 'Add your review',
    });
    this.reviewThreads = this.root.locator('bt-review-thread');
  }

  /** One conversation under the Bite, addressed by the review that opened it. */
  thread(rootReviewId: string): Locator {
    return this.root.getByTestId(`review-thread-${rootReviewId}`);
  }

  /** One answer inside a thread. */
  reply(replyId: string): Locator {
    return this.root.getByTestId(`reply-${replyId}`);
  }

  /** The answers of a thread, in the order they render. */
  repliesOf(rootReviewId: string): Locator {
    return this.thread(rootReviewId).locator('.replies .review-entry');
  }

  private replyInput(rootReviewId: string): Locator {
    return this.thread(rootReviewId)
      .getByTestId('reply-input')
      .locator('textarea');
  }

  /** Opens the composer from the review that opened the thread. */
  async openReplyToReview(rootReviewId: string): Promise<void> {
    await this.thread(rootReviewId).getByTestId('reply-to-review').click();
    await expect(this.replyInput(rootReviewId)).toBeVisible();
  }

  /** Opens the composer from an answer inside the thread. */
  async openReplyToReply(rootReviewId: string, replyId: string): Promise<void> {
    await this.reply(replyId).getByTestId('reply-to-reply').click();
    await expect(this.replyInput(rootReviewId)).toBeVisible();
  }

  /** What the open composer starts out holding, for the `@name` prefill. */
  prefilledReply(rootReviewId: string): Promise<string> {
    return this.replyInput(rootReviewId).inputValue();
  }

  /**
   * Sends the open composer and waits until the answer is on screen, which is
   * what proves it rendered without a page reload.
   */
  async submitThreadReply(rootReviewId: string, text: string): Promise<void> {
    await this.replyInput(rootReviewId).fill(text);
    await this.thread(rootReviewId).getByTestId('submit-reply').click();
    await expect(
      this.thread(rootReviewId).getByText(text, { exact: true }),
    ).toBeVisible();
  }

  async showReplies(rootReviewId: string): Promise<void> {
    await this.thread(rootReviewId).getByTestId('show-replies').click();
  }

  async hideReplies(rootReviewId: string): Promise<void> {
    await this.thread(rootReviewId).getByTestId('hide-replies').click();
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
