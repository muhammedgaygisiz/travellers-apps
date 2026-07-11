import { Locator, Page } from '@playwright/test';

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

  /** Adopts the browser geolocation (set in playwright.config) as the bite position. */
  async useGpsPosition(): Promise<void> {
    await this.fromGps.click();
  }

  async submit(): Promise<void> {
    await this.post.click();
  }
}
