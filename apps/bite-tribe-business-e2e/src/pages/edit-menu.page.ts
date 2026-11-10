import { expect, Locator, Page } from '@playwright/test';
import { expectIonDisabled, expectIonEnabled } from './floor-plan.page';

/**
 * Page object for the business menu editor
 * (route: /restaurant/:restaurantId/menu/:menuId).
 *
 * The editor is reached from the restaurant page's Edit Menu button rather
 * than by URL: the menu route resolves its restaurant from the store, which a
 * deep link has not loaded yet.
 *
 * A save writes the whole menu under a loading overlay and keeps the owner in
 * the editor: a toast reports the outcome, and on success the field's Save and
 * Cancel go away again (issue #1377). Before that, every save left for the
 * restaurant page.
 */
export class EditMenuPage {
  readonly page: Page;
  readonly categoryTitle: Locator;
  readonly saveCategoryTitle: Locator;
  readonly cancelCategoryTitle: Locator;
  readonly itemName: Locator;
  readonly saveItemName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.categoryTitle = page.getByTestId('category-title').locator('input');
    this.saveCategoryTitle = page.getByTestId('save-category-title');
    this.cancelCategoryTitle = page.getByTestId('cancel-category-title');
    this.itemName = page.getByTestId('menu-item-name').locator('input');
    this.saveItemName = page.getByTestId('save-menu-item-name');
  }

  async open(restaurantId: string, menuId: string): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Edit the menu for this restaurant' })
      .click();
    await this.expectOpen(restaurantId, menuId);
  }

  async expectOpen(restaurantId: string, menuId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/restaurant/${restaurantId}/menu/${menuId}$`),
      { timeout: 20_000 },
    );
  }

  /**
   * Asserts the editor is still open after `ms`, by waiting for a navigation
   * away and requiring that none comes. Proving that something does *not*
   * happen needs a window for it to happen in; an assertion on the current URL
   * would pass at once. The editor used to save and leave on its own 500 ms
   * after a keystroke, and on load for a category without a subtitle.
   */
  async expectStaysOpen(
    restaurantId: string,
    menuId: string,
    ms: number,
  ): Promise<void> {
    const editor = new RegExp(`/restaurant/${restaurantId}/menu/${menuId}$`);
    const left = await this.page
      .waitForURL((url) => !editor.test(url.pathname), { timeout: ms })
      .then(
        () => true,
        () => false,
      );

    expect(left, 'the editor saved and left on its own').toBe(false);
  }

  /**
   * A save that landed: the success toast, still in the editor, and the
   * button that sent it gone because the stored menu now holds the edit.
   */
  async expectSaved(
    restaurantId: string,
    menuId: string,
    saveButton: Locator,
  ): Promise<void> {
    await expect(
      this.page.locator('ion-toast').getByText('Menu saved', { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await this.expectOpen(restaurantId, menuId);
    await expect(saveButton).toHaveCount(0);
  }

  /**
   * The editor block of one item: its name, then its own details (description,
   * price, ...) in the first variant editor, with their own Save button.
   */
  itemDetails(): Locator {
    return this.page
      .locator('business-menu-item')
      .first()
      .locator('business-menu-variant')
      .first();
  }

  itemPrice(): Locator {
    return this.itemDetails()
      .locator('ion-input')
      .filter({ hasText: 'Price' })
      .locator('input');
  }

  saveItemDetails(): Locator {
    return this.itemDetails().locator('ion-button', { hasText: 'Save' });
  }

  async expectDisabled(button: Locator): Promise<void> {
    await expectIonDisabled(button);
  }

  async expectEnabled(button: Locator): Promise<void> {
    await expectIonEnabled(button);
  }
}
