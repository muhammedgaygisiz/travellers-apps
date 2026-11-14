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
    // Places 1 to 3 stand on the podium and 4 on are list rows (#2032); both
    // carry the same test hooks, so a journey does not care which it is.
    this.rows = this.root.getByTestId('leaderboard-entry');
    this.emptyState = this.root.locator('.empty-container');
    this.weekEnds = this.root.getByTestId('leaderboard-week-ends');
    this.finalStandings = this.root.getByTestId('leaderboard-final-standings');
  }

  /**
   * Taps a segment button until it is the selected one. A tap that lands
   * before the segment has hydrated changes nothing, and the next step would
   * then read the previous board.
   */
  private async select(button: Locator): Promise<void> {
    await expect(async () => {
      await button.click();
      await expect(button).toHaveClass(/segment-button-checked/, {
        timeout: 1_000,
      });
    }).toPass({ timeout: 15_000 });
  }

  /** The ranking by every Bite a user created; the week is the default. */
  async showAllTime(): Promise<void> {
    await this.select(this.root.getByTestId('leaderboard-tab-all-time'));
  }

  /** Bites ranked by this week's likes (issue #2028). */
  async showMostLiked(): Promise<void> {
    await this.select(this.root.getByTestId('leaderboard-tab-most-liked'));
  }

  /** The Bite row holding this dish name on the Most liked board. */
  biteRowFor(dishName: string): Locator {
    return this.rows.filter({
      has: this.page.locator('.entry-name', { hasText: dishName }),
    });
  }

  /** Last week's frozen final standings, under the week tab. */
  async showLastWeek(): Promise<void> {
    await this.select(this.root.getByTestId('leaderboard-week-last'));
  }

  /** The row holding this display name, wherever it ranks. */
  rowFor(displayName: string): Locator {
    return this.rows.filter({
      has: this.page.locator('.entry-name', { hasText: displayName }),
    });
  }

  async open(): Promise<void> {
    await navigateFromAppMenu(this.page, 'leaderboard');
  }

  row(rank: number): Locator {
    return this.root.locator(
      `[data-testid="leaderboard-entry"][data-rank="${rank}"]`,
    );
  }

  /** The rank an entry holds, wherever it is drawn. */
  async rankOf(entry: Locator): Promise<number> {
    return Number(await entry.getAttribute('data-rank'));
  }

  async expectRankedUser(
    rank: number,
    user: { displayName: string; city: string; biteCount: number },
  ): Promise<void> {
    const row = this.row(rank);

    await expect(row.locator('.entry-name')).toHaveText(user.displayName);
    // The podium names a place by where it stands, without a city line.
    if (rank > 3) {
      await expect(row.locator('.entry-city')).toHaveText(user.city);
    }
    await expect(row.locator('.entry-count')).toHaveText(
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
