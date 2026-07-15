import { expect, Locator, Page } from '@playwright/test';

type SearchCategory = 'Bite' | 'Restaurant' | 'City' | 'User';

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
    // Match the result title (<h2> → ARIA heading) specifically. A custom
    // restaurant's subtitle can equal its name, so a plain getByText would
    // resolve to both the title and subtitle and trip Playwright strict mode.
    await expect(
      this.results.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
  }
}
