import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the create-bite form (route: /new-bite).
 *
 * Ionic form controls (`ion-input`, `ion-searchbar`) render a native input in
 * their shadow root, so those test ids resolve to the host and we drill into
 * the inner `input`. Playwright pierces open shadow DOM automatically.
 */
export class CreateBitePage {
  readonly page: Page;
  readonly footerAddButton: Locator;
  readonly imageInput: Locator;
  readonly name: Locator;
  readonly setRestaurant: Locator;
  readonly restaurantSearch: Locator;
  readonly restaurantCustomOption: Locator;
  readonly price: Locator;
  readonly currency: Locator;
  readonly invalidPriceMessage: Locator;
  readonly fromGps: Locator;
  readonly post: Locator;

  constructor(page: Page) {
    this.page = page;
    this.footerAddButton = page.getByTestId('footer-add-button');
    this.imageInput = page.getByTestId('image-file-input');
    this.name = page.getByTestId('bite-name').locator('input');
    this.setRestaurant = page.getByTestId('set-restaurant');
    this.restaurantSearch = page
      .getByTestId('restaurant-search')
      .locator('input');
    this.restaurantCustomOption = page.getByTestId('restaurant-custom-option');
    this.price = page.getByTestId('bite-price').locator('input');
    this.currency = page.locator('#currency-selector-trigger-bite');
    this.invalidPriceMessage = page
      .locator('bt-price-input ion-text[color="danger"]')
      .filter({ hasText: 'Please enter a valid price' });
    this.fromGps = page.getByTestId('position-from-gps');
    this.post = page.getByTestId('post-bite');
  }

  /**
   * Opens the create-bite form via the home footer button (in-app navigation).
   * A hard `goto('/new-bite')` reloads the SPA and the auth guard bounces back
   * to home before Firebase auth is restored, so we navigate from within the app.
   */
  async open(): Promise<void> {
    await this.footerAddButton.click();
    await this.page.waitForURL('**/new-bite');
  }

  async uploadImage(filePath: string): Promise<void> {
    // The <input type="file"> is hidden (.ion-hide); setInputFiles bypasses the
    // visibility check, mirroring a real file pick.
    await this.imageInput.setInputFiles(filePath);
  }

  async fillName(name: string): Promise<void> {
    await this.name.fill(name);
  }

  /**
   * Opens the restaurant selector, types a name and picks the "Use: ..." custom
   * entry — the deterministic path that needs neither seeded restaurants nor the
   * Google Places callable.
   */
  async chooseCustomRestaurant(name: string): Promise<void> {
    await this.setRestaurant.click();
    await this.restaurantSearch.fill(name);
    await this.restaurantCustomOption.click();
  }

  async fillPrice(price: string): Promise<void> {
    await this.price.fill(price);
  }

  async expectCurrency(currencyName: string): Promise<void> {
    await expect(this.currency).toContainText(currencyName);
  }

  async chooseCurrency(currencyCode: string): Promise<void> {
    await this.currency.click();

    const selector = this.page.locator('currency-selector');
    await expect(selector).toBeVisible();
    await selector.locator('ion-searchbar input').fill(currencyCode);
    await selector
      .locator('ion-item')
      .filter({ hasText: new RegExp(`\\b${currencyCode}\\b`) })
      .click();
  }

  async expectInvalidPriceMessage(): Promise<void> {
    await expect(this.invalidPriceMessage).toBeVisible();
  }

  async expectNoInvalidPriceMessage(): Promise<void> {
    await expect(this.invalidPriceMessage).not.toBeVisible();
  }

  async expectPostEnabled(): Promise<void> {
    await expect(this.post).not.toHaveAttribute('aria-disabled', 'true');
  }

  async expectPostDisabled(): Promise<void> {
    await expect(this.post).toHaveAttribute('aria-disabled', 'true');
  }

  /** Adopts the browser geolocation (set in playwright.config) as the bite position. */
  async useGpsPosition(): Promise<void> {
    await this.fromGps.click();
  }

  async submit(): Promise<void> {
    await this.post.click();
  }
}
