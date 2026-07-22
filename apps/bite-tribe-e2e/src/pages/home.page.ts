import { expect, Locator, Page } from '@playwright/test';

export type LikeReaction = 'thumbup' | 'drooling' | 'mindblown';

/**
 * Page object for the home feed (route: /home) — specifically the like/react
 * interaction on a Bite card.
 *
 * Each Bite renders as a `bt-bite` custom element; we scope to a single card by
 * its (unique) title text. The reaction popover is an Ionic overlay appended to
 * the document body, so its option chips are queried from the page root rather
 * than from within the card.
 */
export class HomePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The Bite card whose title contains the given name. */
  biteCard(name: string): Locator {
    return this.page.locator('bt-bite').filter({ hasText: name });
  }

  async openBite(name: string): Promise<void> {
    await this.biteCard(name).locator('ion-card-title').click();
    await this.page.waitForURL(/\/bite\/[^/]+$/);
  }

  /**
   * Opens the reaction popover on the named Bite and picks a reaction.
   * `like-chip` opens the popover; `like-option-<reaction>` lives in the
   * body-level ion-popover overlay.
   */
  async react(name: string, reaction: LikeReaction): Promise<void> {
    await this.biteCard(name).getByTestId('like-chip').click();
    await this.page.getByTestId(`like-option-${reaction}`).click();
  }

  /** Asserts the aggregated like count shown on the named Bite's chip. */
  async expectLikeCount(name: string, count: string): Promise<void> {
    await expect(this.biteCard(name).getByTestId('like-count')).toHaveText(
      count,
    );
  }
}
