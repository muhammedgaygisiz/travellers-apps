import { Locator, Page } from '@playwright/test';

/** Page object for the admin app's Create Restaurant page (`/new-restaurant`). */
export class NewRestaurantPage {
  readonly page: Page;
  readonly photoInput: Locator;
  readonly name: Locator;
  readonly map: Locator;
  readonly save: Locator;

  constructor(page: Page) {
    this.page = page;
    // The shared image-upload renders a hidden file input on the web.
    this.photoInput = page.getByTestId('image-file-input');
    this.name = page.locator('ion-input[formcontrolname="name"] input');
    this.map = page.locator('position .leaflet-container');
    this.save = page.locator('ion-button.save-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/new-restaurant');
  }

  async choosePhoto(path: string): Promise<void> {
    await this.photoInput.setInputFiles(path);
  }

  /** Places the restaurant by clicking the middle of the map. */
  async placeOnMap(): Promise<void> {
    await this.map.waitFor();
    await this.map.click();
  }
}
