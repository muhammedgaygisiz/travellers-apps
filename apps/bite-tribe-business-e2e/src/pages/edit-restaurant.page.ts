import { expect, Locator, Page } from '@playwright/test';

export interface RestaurantAddress {
  street: string;
  postcode: string;
  city: string;
  country: string;
}

/**
 * Page object for the business edit-restaurant screen
 * (route: /restaurant/:restaurantId).
 *
 * The page saves each block on its own — About and the address have separate
 * Save buttons — so the test ids distinguish them. Ionic renders the native
 * `<input>`/`<textarea>` inside the shadow root of `ion-input`/`ion-textarea`,
 * so the test ids resolve to the host and we drill into the inner control.
 */
export class EditRestaurantPage {
  readonly page: Page;
  readonly name: Locator;
  readonly description: Locator;
  readonly saveDescription: Locator;
  readonly street: Locator;
  readonly postcode: Locator;
  readonly city: Locator;
  readonly country: Locator;
  readonly saveAddress: Locator;

  constructor(page: Page) {
    this.page = page;
    this.name = page.getByTestId('restaurant-name');
    this.description = page
      .getByTestId('restaurant-description')
      .locator('textarea');
    this.saveDescription = page.getByTestId('save-description');
    this.street = page.getByTestId('restaurant-street').locator('input');
    this.postcode = page.getByTestId('restaurant-postcode').locator('input');
    this.city = page.getByTestId('restaurant-city').locator('input');
    this.country = page.getByTestId('restaurant-country').locator('input');
    this.saveAddress = page.getByTestId('save-address');
  }

  async expectRestaurantName(name: string): Promise<void> {
    await expect(this.name).toHaveText(name);
  }

  async fillDescription(description: string): Promise<void> {
    await this.description.fill(description);
    await this.saveDescription.click();
  }

  async fillAddress(address: RestaurantAddress): Promise<void> {
    await this.street.fill(address.street);
    await this.postcode.fill(address.postcode);
    await this.city.fill(address.city);
    await this.country.fill(address.country);
    await this.saveAddress.click();
  }

  /**
   * The save handlers report through the shared `ToastService`, which presents
   * one `ion-toast` at the top and dismisses any toast still on screen before
   * the next one. A success auto-dismisses after 5s, so assert on the one that
   * is currently presented. The copy is a Transloco key rather than a literal
   * since issue #1305, so these strings come from the business locale file.
   */
  async expectSavedToast(message: string): Promise<void> {
    await expect(
      this.page.locator('ion-toast').getByText(message, { exact: true }),
    ).toBeVisible();
  }
}
