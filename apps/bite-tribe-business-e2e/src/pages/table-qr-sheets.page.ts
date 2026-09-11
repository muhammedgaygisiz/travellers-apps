import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the printable table codes
 * (route: `/restaurant/:restaurantId/floor-plan/qr-codes`).
 *
 * The page asks the backend for the tokens as it loads, because issuing them
 * is idempotent and an owner who has just published a plan should reach a
 * sheet that is ready to print. So the first thing a journey waits for is a
 * code appearing, not a button to press.
 *
 * Printing itself is deliberately not driven. `window.print()` opens the
 * browser's own dialog, which Playwright cannot see into and which would hang
 * the run; what the journeys assert is the preview, which is the same elements
 * at the same millimetre sizes as the paper.
 */
export class TableQrSheetsPage {
  readonly page: Page;
  readonly sheet: Locator;
  readonly codes: Locator;
  readonly empty: Locator;
  readonly disabled: Locator;
  readonly missing: Locator;
  readonly print: Locator;
  readonly selectAll: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sheet = page.getByTestId('qr-sheets-sheet');
    this.codes = page.locator('[data-testid="table-qr-code"]');
    this.empty = page.getByTestId('qr-sheets-empty');
    this.disabled = page.getByTestId('qr-sheets-disabled');
    this.missing = page.getByTestId('qr-sheets-missing');
    this.print = page.getByTestId('qr-sheets-print');
    this.selectAll = page.getByTestId('qr-sheets-select-all');
  }

  async goto(restaurantId: string): Promise<void> {
    await this.page.goto(`/restaurant/${restaurantId}/floor-plan/qr-codes`);
  }

  /**
   * Waits for the tokens to have been issued and drawn.
   *
   * The callable runs behind the page load, so the code count is the signal
   * that it answered. A sheet with fewer codes than tables is a real outcome
   * the page reports separately, which is why {@link missing} exists.
   */
  async expectCodes(count: number): Promise<void> {
    await expect(this.codes).toHaveCount(count, { timeout: 30_000 });
    await expect(this.missing).toHaveCount(0);
  }

  /** One printed code and the text beside it, by the table it belongs to. */
  code(tableId: string): Locator {
    return this.page.getByTestId(`qr-sheets-code-${tableId}`);
  }

  /** One sheet of paper in the preview. */
  sheetPage(number: number): Locator {
    return this.page.getByTestId(`qr-sheets-page-${number}`);
  }

  /** The tick beside one table in the list on the left. */
  tableRow(tableId: string): Locator {
    return this.page.getByTestId(`qr-sheets-table-${tableId}`);
  }
}
