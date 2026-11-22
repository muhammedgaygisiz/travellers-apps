import { expect, Locator, Page } from '@playwright/test';
import { expectIonDisabled, expectIonEnabled } from './floor-plan.page';

/**
 * Page object for the business menu editor
 * (route: /restaurant/:restaurantId/menu/:menuId).
 *
 * The editor is reached from the restaurant overview's Edit menu button rather
 * than by URL: the menu route resolves its restaurant from the store, which a
 * deep link has not loaded yet.
 *
 * The menu is a list; a dish or a category opens its own editor with one Save
 * (GitHub issue #2182). A save writes the whole menu under a loading overlay,
 * keeps the owner on the page with a toast, and closes the editor once the
 * saved menu has been read back.
 */
export class EditMenuPage {
  readonly page: Page;
  readonly editorPanel: Locator;
  readonly categoryTitle: Locator;
  readonly saveCategory: Locator;
  readonly dishName: Locator;
  readonly dishPrice: Locator;
  readonly saveDish: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editorPanel = page.getByTestId('menu-editor-panel');
    this.categoryTitle = page.getByTestId('category-title').locator('input');
    this.saveCategory = page.getByTestId('save-category');
    this.dishName = page.getByTestId('dish-name').locator('input');
    this.dishPrice = page.getByTestId('dish-price').locator('input');
    this.saveDish = page.getByTestId('save-dish');
  }

  async open(restaurantId: string, menuId: string): Promise<void> {
    await this.page.getByTestId('restaurant-edit-menu').click();
    await this.expectOpen(restaurantId, menuId);
  }

  async expectOpen(restaurantId: string, menuId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/restaurant/${restaurantId}/menu/${menuId}$`),
      { timeout: 20_000 },
    );
  }

  /** Opens a category's editor from its edit button in the list. */
  async openCategory(categoryId: string): Promise<void> {
    await this.page
      .getByTestId(`menu-category-${categoryId}`)
      .getByTestId('edit-category')
      .click();
    await expect(this.editorPanel).toBeVisible();
  }

  /** Opens a dish's editor from its line in the list. */
  async openDish(itemId: string): Promise<void> {
    await this.page
      .getByTestId(`menu-dish-${itemId}`)
      .getByTestId('open-dish')
      .click();
    await expect(this.editorPanel).toBeVisible();
  }

  /**
   * Deletes the open dish or category: the editor's Delete button, then the
   * confirmation's Delete (GitHub issue #2181).
   */
  async deleteOpen(kind: 'dish' | 'category'): Promise<void> {
    await this.page.getByTestId(`delete-${kind}`).click();

    const alert = this.page.locator('ion-alert');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Delete', exact: true }).click();
  }

  /**
   * Takes a menu built from Bites as the restaurant's: the notice's button,
   * then the confirmation's (GitHub issue #2214).
   */
  async confirmOwnMenu(): Promise<void> {
    await this.page.getByTestId('confirm-menu-own').click();

    const alert = this.page.locator('ion-alert');
    await expect(alert).toBeVisible();
    await alert
      .getByRole('button', { name: 'This is our menu', exact: true })
      .click();
  }

  variantName(index: number): Locator {
    return this.page.getByTestId(`dish-variant-name-${index}`).locator('input');
  }

  /** The button that moves a variant row one place down (issue #2256). */
  moveVariantDown(index: number): Locator {
    return this.page.getByTestId(`move-dish-variant-down-${index}`);
  }

  variantPrice(index: number): Locator {
    return this.page
      .getByTestId(`dish-variant-price-${index}`)
      .locator('input');
  }

  /**
   * Chooses the menu's currency from the picker, which saves it on its own
   * path and reads the menu back (issues #1102 and #2259).
   */
  async chooseCurrency(code: string): Promise<void> {
    await this.page.getByTestId('menu-currency').click();
    await this.page
      .getByTestId('menu-currency-search')
      .locator('input')
      .fill(code);
    await this.page.getByTestId(`menu-currency-option-${code}`).click();
    await expect(
      this.page.locator('ion-toast').getByText('Currency saved', {
        exact: true,
      }),
    ).toBeVisible({ timeout: 20_000 });
  }

  /** An existing extra's price field in the category editor (issue #2258). */
  extraPrice(extraId: string): Locator {
    return this.page
      .getByTestId(`category-extra-price-${extraId}`)
      .locator('input');
  }

  get cancelCategory(): Locator {
    return this.page.getByTestId('cancel-category');
  }

  variantToggle(variantId: string): Locator {
    return this.page
      .getByTestId(`menu-variant-${variantId}`)
      .locator('ion-toggle');
  }

  /**
   * Asserts the editor is still open after `ms`, by waiting for it to close
   * and requiring that it does not. Proving that something does *not* happen
   * needs a wait; the old editor saved and left on its own 500 ms after a
   * keystroke.
   */
  async expectStaysOpen(ms: number): Promise<void> {
    const closed = await this.editorPanel
      .waitFor({ state: 'detached', timeout: ms })
      .then(
        () => true,
        () => false,
      );

    expect(closed, 'the editor saved and closed on its own').toBe(false);
  }

  /**
   * A save that landed: the success toast, still in the menu editor, and the
   * editor closed because the stored menu now holds the edit.
   */
  async expectSaved(restaurantId: string, menuId: string): Promise<void> {
    await expect(
      this.page.locator('ion-toast').getByText('Menu saved', { exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await this.expectOpen(restaurantId, menuId);
    await expect(this.editorPanel).toHaveCount(0);
  }

  async expectDisabled(button: Locator): Promise<void> {
    await expectIonDisabled(button);
  }

  async expectEnabled(button: Locator): Promise<void> {
    await expectIonEnabled(button);
  }
}
