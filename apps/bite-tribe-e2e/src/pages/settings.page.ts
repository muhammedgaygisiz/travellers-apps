import { expect, Locator, Page } from '@playwright/test';
import { navigateFromAppMenu } from '../support/app-menu';

export type Theme = 'Light' | 'Dark';

/**
 * Page object for the settings screen (route: /settings).
 *
 * Both currency pickers are the same `currency-selector` rendered in an
 * `ion-modal`: the preferred-currency one picks a code, the favorites one only
 * toggles hearts. Its rows are addressed by currency code, which the row prints
 * next to the symbol.
 */
export class SettingsPage {
  readonly page: Page;
  readonly root: Locator;
  readonly saveButton: Locator;
  readonly themeSelect: Locator;
  readonly currencyRow: Locator;
  readonly favoriteCurrenciesRow: Locator;
  readonly languageSelect: Locator;
  readonly emailVerificationPrompt: Locator;
  readonly currencySelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('settings');
    this.saveButton = this.root.getByTestId('settings-save');
    this.themeSelect = this.root.getByTestId('settings-theme');
    this.currencyRow = this.root.getByTestId('settings-currency');
    this.favoriteCurrenciesRow = this.root.getByTestId(
      'settings-favorite-currencies',
    );
    this.languageSelect = this.root.getByTestId('settings-language');
    this.emailVerificationPrompt = this.root.getByTestId(
      'settings-email-verification',
    );
    // The modals are appended to the body, so the selector lives outside `root`.
    this.currencySelector = page.locator('currency-selector:visible');
  }

  async open(): Promise<void> {
    await navigateFromAppMenu(this.page, 'settings');
  }

  /** The highlighted tier card. Free and PRO both render; only one is current. */
  async expectAccountType(tier: 'Free tier' | 'PRO tier'): Promise<void> {
    await expect(this.root.locator(`[aria-label="${tier}"]`)).toHaveAttribute(
      'aria-current',
      'true',
    );
  }

  /**
   * Nothing is saveable until something changes: the button is bound to the
   * form's pristine state as well as its validity.
   */
  async expectSaveDisabled(): Promise<void> {
    await expect(this.saveButton).toHaveAttribute('aria-disabled', 'true');
  }

  private currencyRowFor(code: string): Locator {
    return this.currencySelector.locator('ion-item').filter({ hasText: code });
  }

  private async searchCurrency(code: string): Promise<void> {
    await this.currencySelector.locator('ion-searchbar input').fill(code);
    await expect(this.currencyRowFor(code)).toBeVisible();
  }

  async choosePreferredCurrency(code: string): Promise<void> {
    await this.currencyRow.click();
    await this.searchCurrency(code);
    await this.currencyRowFor(code).click();
    // Picking a currency dismisses the modal; the selector is gone afterwards.
    await expect(this.currencySelector).toHaveCount(0);
  }

  /**
   * Toggles a favorite and closes the modal. The favorites modal has no picking
   * step — its left button is a plain "Save" that just dismisses, because the
   * heart already wrote through to the form.
   */
  async toggleFavoriteCurrency(code: string): Promise<void> {
    await this.favoriteCurrenciesRow.click();
    await this.searchCurrency(code);
    await this.currencyRowFor(code)
      .getByRole('button', { name: 'add to favorite currencies' })
      .click();
    await this.currencySelector
      .getByRole('button', { name: 'Save', exact: true })
      .click();
    await expect(this.currencySelector).toHaveCount(0);
  }

  async selectTheme(theme: Theme): Promise<void> {
    await this.themeSelect.click();
    await this.page.getByRole('radio', { name: theme, exact: true }).click();
  }

  async expectPreferredCurrency(name: string): Promise<void> {
    await expect(this.currencyRow).toContainText(name);
  }

  async expectFavoriteCurrencies(names: string): Promise<void> {
    await expect(this.favoriteCurrenciesRow).toContainText(names);
  }

  /**
   * Saving reloads the whole SPA (the language switch needs a fresh bootstrap)
   * while the page also navigates back to Home. Neither the URL nor the load
   * state can be waited on: the reload races that navigation, so the URL may
   * never change and the current document is already loaded. Marking this
   * document and waiting for the mark to disappear is what actually proves the
   * new one arrived.
   */
  async save(): Promise<void> {
    await expect(this.saveButton).not.toHaveAttribute('aria-disabled', 'true');

    await this.page.evaluate(() => {
      (window as Window & { beforeSettingsSave?: boolean }).beforeSettingsSave =
        true;
    });

    await this.saveButton.click();

    await this.page.waitForFunction(
      () =>
        !(window as Window & { beforeSettingsSave?: boolean })
          .beforeSettingsSave,
    );

    // The restarted app settles on Home or back on settings, depending on which
    // side of that race won and on how fast the auth guard restores.
    await expect(this.page.locator('settings, bt-home').first()).toBeVisible({
      timeout: 30_000,
    });
  }

  /** Returns to settings after a save, from wherever the reload landed. */
  async reopen(): Promise<void> {
    if (new URL(this.page.url()).pathname !== '/settings') {
      await this.open();
    }

    await expect(this.root).toBeVisible();
  }
}
