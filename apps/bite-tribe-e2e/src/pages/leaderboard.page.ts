import { expect, Locator, Page } from '@playwright/test';
import { navigateFromAppMenu } from '../support/app-menu';

/**
 * Page object for the leaderboard (route: /leaderboard).
 *
 * The ranking is positional, so rows are addressed by index rather than by name:
 * the rank badge a row carries is only trustworthy if the row order is what put
 * it there.
 */
export class LeaderboardPage {
  readonly page: Page;
  readonly root: Locator;
  readonly rows: Locator;
  readonly emptyState: Locator;
  readonly weekEnds: Locator;
  readonly finalStandings: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('leaderboard-list');
    this.rows = this.root.locator('ion-item.leaderboard-item');
    this.emptyState = this.root.locator('.empty-container');
    this.weekEnds = this.root.getByTestId('leaderboard-week-ends');
    this.finalStandings = this.root.getByTestId('leaderboard-final-standings');
  }

  /** The ranking by every Bite a user created; the week is the default. */
  async showAllTime(): Promise<void> {
    await this.root.getByTestId('leaderboard-tab-all-time').click();
  }

  /** Bites ranked by this week's likes (issue #2028). */
  async showMostLiked(): Promise<void> {
    await this.root.getByTestId('leaderboard-tab-most-liked').click();
  }

  /** The Bite row holding this dish name on the Most liked board. */
  biteRowFor(dishName: string): Locator {
    return this.root.locator('ion-item.leaderboard-bite').filter({
      has: this.page.locator('ion-label h2', { hasText: dishName }),
    });
  }

  /** Last week's frozen final standings, under the week tab. */
  async showLastWeek(): Promise<void> {
    await this.root.getByTestId('leaderboard-week-last').click();
  }

  /** The row holding this display name, wherever it ranks. */
  rowFor(displayName: string): Locator {
    return this.rows.filter({
      has: this.page.locator('ion-label h2', { hasText: displayName }),
    });
  }

  async open(): Promise<void> {
    await navigateFromAppMenu(this.page, 'leaderboard');
  }

  row(rank: number): Locator {
    return this.rows.nth(rank - 1);
  }

  async expectRankedUser(
    rank: number,
    user: { displayName: string; city: string; biteCount: number },
  ): Promise<void> {
    const row = this.row(rank);

    await expect(row.locator('.rank-badge')).toHaveText(String(rank));
    await expect(row.locator('ion-label h2')).toHaveText(user.displayName);
    await expect(row.locator('ion-label p')).toHaveText(user.city);
    await expect(row.locator('.bite-count')).toHaveText(
      `${user.biteCount} Bites`,
    );
  }

  /** Only public users are linked; the row is a button for them and nothing else. */
  async openProfile(rank: number, userId: string): Promise<void> {
    await this.row(rank).click();
    await this.page.waitForURL(`**/profile/${userId}`);
  }

  async expectEmpty(message = 'No leaderboard users yet'): Promise<void> {
    await expect(this.emptyState).toContainText(message);
    await expect(this.rows).toHaveCount(0);
  }
}
