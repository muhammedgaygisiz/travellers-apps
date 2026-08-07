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
  readonly addButton: Locator;
  readonly imageInput: Locator;
  readonly name: Locator;
  readonly setRestaurant: Locator;
  readonly restaurantSearch: Locator;
  readonly restaurantCustomOption: Locator;
  readonly price: Locator;
  readonly currency: Locator;
  readonly invalidPriceMessage: Locator;
  readonly description: Locator;
  readonly tagsInput: Locator;
  readonly fromGps: Locator;
  readonly post: Locator;
  readonly postAndAddAnother: Locator;
  readonly backButton: Locator;
  readonly selectedPlace: Locator;
  readonly tagChips: Locator;
  readonly suggestedTags: Locator;
  readonly filledStars: Locator;
  readonly imagePreview: Locator;
  readonly creatingOverlay: Locator;

  constructor(page: Page) {
    this.page = page;
    // Matches whichever add button the current layout shows. The desktop layout
    // moves it from the footer bar into the header and hides the bar, and both
    // stay in the DOM at every width, so selecting on visibility is what tells
    // them apart. See GitHub issue #1250.
    //
    // `:visible` is also what scopes this to the current page: Ionic keeps the
    // pages it has navigated away from in the DOM, so their footers answer this
    // test id as well.
    this.addButton = page.locator(
      '[data-testid="footer-add-button"]:visible, [data-testid="header-add-button"]:visible',
    );
    this.backButton = page.locator('bite ion-back-button');
    this.selectedPlace = page.locator('bite .selected-place-name');
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
    this.description = page.locator(
      'ion-textarea[formcontrolname="description"] textarea',
    );
    this.tagsInput = page.locator('bt-tags-input ion-input input');
    this.fromGps = page.getByTestId('position-from-gps');
    this.post = page.getByTestId('post-bite');
    this.postAndAddAnother = page.getByTestId('post-bite-and-add-another');
    this.tagChips = page.locator('bite bt-tags-input .container bt-chip');
    this.suggestedTags = page.locator(
      'bite bt-tags-input .suggestions bt-chip',
    );
    this.filledStars = page.locator(
      'bite star-rating:not([readonly]) ion-icon.filled',
    );
    this.imagePreview = page.locator('bite image-upload .image-preview img');
    // The overlay the create runs behind. Ionic removes it from the DOM on
    // dismiss, so waiting for it to disappear is how the next Bite of an
    // "add another" session avoids being typed against the backdrop.
    this.creatingOverlay = page.locator('ion-loading.bite-creating-loading');
  }

  /**
   * Opens the create-bite form via the home add button (in-app navigation).
   * A hard `goto('/new-bite')` reloads the SPA and the auth guard bounces back
   * to home before Firebase auth is restored, so we navigate from within the app.
   */
  async open(): Promise<void> {
    await this.addButton.click();
    await this.page.waitForURL('**/new-bite');
  }

  /** Leaves the form without saving, the way a user cancels the flow. */
  async cancel(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL((url) => !url.pathname.endsWith('/new-bite'));
  }

  /** Asserts the dish and Restaurant a prefilled creation session was seeded with. */
  async expectPrefilledWith(options: {
    name: string;
    place: string;
    price: string;
  }): Promise<void> {
    await expect(this.name).toHaveValue(options.name);
    await expect(this.selectedPlace).toHaveText(options.place);
    await expect(this.price).toHaveValue(options.price);
  }

  /**
   * Asserts the form carries no draft from an earlier creation session: no dish,
   * no Restaurant, no price.
   */
  async expectCleanForm(): Promise<void> {
    await expect(this.name).toHaveValue('');
    await expect(this.selectedPlace).toHaveCount(0);
    await expect(this.setRestaurant).toBeVisible();
    await expect(this.price).toHaveValue('');
  }

  async uploadImage(filePath: string): Promise<void> {
    // The <input type="file"> is hidden (.ion-hide); setInputFiles bypasses the
    // visibility check, mirroring a real file pick.
    //
    // Cleared first because the form reset of "Post and add another Bite"
    // clears the form control but not the DOM input: setting a file the input
    // already holds is no change at all, so the next Bite of a session would
    // silently keep no photo. A real picker always reports its selection, so
    // this is a harness detail, not app behaviour.
    await this.imageInput.setInputFiles([]);
    await this.imageInput.setInputFiles(filePath);

    // The pick is read and compressed asynchronously; the preview is the form
    // saying it now holds the photo.
    await expect(this.imagePreview).toBeVisible();
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
    await this.openRestaurantSelector();
    await this.restaurantSearch.fill(name);
    await this.restaurantCustomOption.click();
  }

  async chooseGoogleRestaurant(
    searchTerm: string,
    restaurantName: string,
  ): Promise<void> {
    await this.openRestaurantSelector();
    await this.restaurantSearch.fill(searchTerm);
    await this.page
      .locator('lib-restaurant-selector ion-item[button]')
      .filter({ hasText: searchTerm })
      .click();
    await this.page
      .locator('lib-restaurant-selector ion-item')
      .filter({
        has: this.page.getByRole('heading', {
          name: restaurantName,
          exact: true,
        }),
      })
      .click();
  }

  async chooseLocalRestaurant(restaurantName: string): Promise<void> {
    await this.openRestaurantSelector();
    await this.restaurantSearch.fill(restaurantName);
    await this.page
      .locator('lib-restaurant-selector ion-item')
      .filter({
        has: this.page.getByRole('heading', {
          name: restaurantName,
          exact: true,
        }),
      })
      .click();
  }

  private async openRestaurantSelector(): Promise<void> {
    if (await this.setRestaurant.isVisible()) {
      await this.setRestaurant.click();
      return;
    }

    await this.page.getByRole('button', { name: 'Change restaurant' }).click();
  }

  async fillPrice(price: string): Promise<void> {
    await this.price.fill(price);
  }

  async fillDescription(description: string): Promise<void> {
    await this.description.fill(description);
  }

  async chooseRating(rating: number): Promise<void> {
    await this.page
      .locator('star-rating:not([readonly])')
      .locator(`[aria-label="${rating} star"]`)
      .click();
  }

  async addTag(tag: string): Promise<void> {
    await this.tagsInput.fill(`${tag},`);
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
    await expect(this.invalidPriceMessage).toBeHidden();
  }

  async expectPostEnabled(): Promise<void> {
    await expect(this.post).not.toHaveAttribute('aria-disabled', 'true');
  }

  async expectPostDisabled(): Promise<void> {
    await expect(this.post).toHaveAttribute('aria-disabled', 'true');
  }

  /**
   * `toBeEnabled()` says nothing about an `ion-button`: it is a custom element,
   * so Playwright reads neither its `disabled` property nor the class Ionic
   * sets. `aria-disabled` is what the component actually exposes.
   */
  async expectPostAndAddAnotherEnabled(): Promise<void> {
    await expect(this.postAndAddAnother).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  }

  /** Adopts the browser geolocation (set in playwright.config) as the bite position. */
  async useGpsPosition(): Promise<void> {
    await this.fromGps.click();
  }

  async submit(): Promise<void> {
    await this.post.click();
  }

  /**
   * Posts the Bite through "Post and add another Bite" and waits for the create
   * to finish, which is what leaves the form usable for the next Bite.
   */
  async submitAndAddAnother(): Promise<void> {
    await this.postAndAddAnother.click();
    await expect(this.creatingOverlay).toHaveCount(0);
  }

  /**
   * Asserts the form is ready for the next Bite of the same session: everything
   * that belonged to the Bite just posted is gone, while the place the user is
   * still sitting at — and the currency that goes with it — is kept.
   */
  async expectReadyForNextBite(options: {
    place: string;
    currency: string;
  }): Promise<void> {
    await expect(this.name).toHaveValue('');
    await expect(this.price).toHaveValue('');
    await expect(this.description).toHaveValue('');
    await expect(this.tagChips).toHaveCount(0);
    await expect(this.filledStars).toHaveCount(0);

    await expect(this.selectedPlace).toHaveText(options.place);
    await expect(this.currency).toContainText(options.currency);

    // The photo is cleared with the rest, so the same Bite cannot be posted
    // twice by tapping again.
    await this.expectPostDisabled();
  }

  /** The currency the form currently carries, as the trigger displays it. */
  async currencyName(): Promise<string> {
    return (await this.currency.innerText()).trim();
  }

  /** Asserts a tag is offered as a suggestion, e.g. from a Bite posted before. */
  async expectSuggestedTag(tag: string): Promise<void> {
    await expect(this.suggestedTags.filter({ hasText: tag })).toBeVisible();
  }
}
