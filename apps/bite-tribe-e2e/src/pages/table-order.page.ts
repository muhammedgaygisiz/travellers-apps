import { expect, Locator, Page } from '@playwright/test';

/**
 * The guest's half of a QR table order (routes `/t/:token` and `/t/:token/order`).
 *
 * No sign-in anywhere in it. The scan screen signs the guest in anonymously
 * when they confirm the table, which is the whole point of the flow: a guest
 * sitting down with a phone has no BiteTribe account and may never want one.
 */
export class TableOrderPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private testId(id: string): Locator {
    return this.page.locator(`[data-testid="${id}"]`);
  }

  /** Opens the printed code, as a camera would. */
  async scan(token: string): Promise<void> {
    await this.page.goto(`/t/${token}`);
    await expect(this.testId('table-session-confirm')).toBeVisible();
  }

  /** Confirms the table, which is where the anonymous account is created. */
  async sitDown(): Promise<void> {
    await this.testId('table-session-confirm-action').click();
    await expect(this.testId('table-session-joined')).toBeVisible();
  }

  async openMenu(): Promise<void> {
    await this.testId('table-session-order').click();
    await expect(this.testId('table-order-menu')).toBeVisible();
  }

  async addToCart(dish: string): Promise<void> {
    await this.page
      .locator('menu-item')
      .filter({ hasText: dish })
      .locator('[data-testid="menu-item-add-to-cart"]')
      .click();
    await expect(this.testId('cart-line')).toBeVisible();
  }

  async send(): Promise<void> {
    await this.testId('table-order-submit').click();
  }

  /** The panel shown when the phone could not confirm the order arrived. */
  get unconfirmed(): Locator {
    return this.testId('table-order-unconfirmed');
  }

  get confirmation(): Locator {
    return this.testId('table-order-placed');
  }

  /** The line that tells a retry which found its own order apart from a send. */
  get alreadyPlaced(): Locator {
    return this.testId('table-order-placed-replayed');
  }

  /** One row per order this guest has sent on this visit. */
  get orders(): Locator {
    return this.testId('table-order-entry');
  }
}
