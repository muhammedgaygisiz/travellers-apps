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
  readonly genderNeutralRestroom: Locator;
  readonly saveFacilities: Locator;

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
    this.genderNeutralRestroom = page.getByTestId('gender-neutral-restroom');
    this.saveFacilities = page.getByTestId('save-facilities');
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
   * The facilities select is a popover, which Ionic renders outside the page,
   * so the answer is picked from `ion-select-popover` rather than from the
   * select itself. Picking an answer closes the popover.
   */
  async chooseGenderNeutralRestroom(
    answer: 'Yes' | 'No' | 'Not stated',
  ): Promise<void> {
    await this.genderNeutralRestroom.click();
    await this.page
      .locator('ion-select-popover')
      .getByText(answer, { exact: true })
      .click();
    await this.saveFacilities.click();
  }

  async expectGenderNeutralRestroom(
    value: 'yes' | 'no' | 'not-stated',
  ): Promise<void> {
    await expect(this.genderNeutralRestroom).toHaveJSProperty('value', value);
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
