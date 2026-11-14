import { expect, Locator, Page } from '@playwright/test';

type SearchCategory = 'Bite' | 'Country' | 'User';

/**
 * Page object for the search screen (route: /search).
 *
 * Ionic's `ion-searchbar` renders a native input in shadow DOM. Playwright
 * pierces open shadow DOM, so drilling into `input` keeps the caller simple.
 */
export class SearchPage {
  readonly page: Page;
  readonly searchChip: Locator;
  readonly searchInput: Locator;
  readonly results: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchChip = page.getByTestId('search-chip');
    this.searchInput = page.locator('ion-searchbar input');
    this.results = page.getByTestId('search-results');
  }

  async open(): Promise<void> {
    await this.searchChip.click();
    await this.page.waitForURL('**/search');
  }

  async selectCategory(category: SearchCategory): Promise<void> {
    await this.page
      .getByTestId('search-categories')
      .getByRole('radio', { name: category, exact: true })
      .click();
  }

  async search(searchText: string): Promise<void> {
    await this.searchInput.fill(searchText);
  }

  async expectResult(title: string): Promise<void> {
    // Match the result title (<h2> → ARIA heading) specifically. A Bite's
    // subtitle carries its restaurant, so a plain getByText for a restaurant
    // name would resolve to every Bite there and trip Playwright strict mode.
    await expect(
      this.results.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }

  /**
   * A result row on a phone, or a Bite card at desktop widths (GitHub issue
   * #1791). Since #2026 every Bite category renders cards there, so Bites
   * search results are cards in the desktop e2e viewport.
   */
  result(title: string): Locator {
    return this.results.locator('ion-item, bt-bite').filter({
      has: this.page.getByRole('heading', { name: title, exact: true }),
    });
  }

  /** Clicks the title, which opens the result in both the row and the card. */
  async openResult(title: string): Promise<void> {
    await this.result(title)
      .getByRole('heading', { name: title, exact: true })
      .click();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.page.getByTestId('search-empty')).toContainText(
      'No search results found.',
    );
  }
}
