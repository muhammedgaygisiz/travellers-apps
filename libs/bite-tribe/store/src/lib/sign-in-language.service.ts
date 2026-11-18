import { inject, Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'ta-firestore';
import { SettingsApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from './bite-tribe-store.service';
import type { Settings } from 'model';
import { LANGUAGE_PREFERENCE_KEY, SHIPPED_LANGUAGES } from 'utils';

const isShipped = (language: string | undefined): language is string =>
  SHIPPED_LANGUAGES.some((option) => option.code === language);

/**
 * Settles the app language against the account's after a sign-in
 * (issue #2104).
 *
 * The app opens in the language chosen on this device, or else the device
 * language, so it can differ from the one the account saved elsewhere:
 *
 * - An account with no language takes the one on screen, without asking.
 * - An account whose language differs is asked once which one to use. Keeping
 *   the language on screen - or dismissing the question - writes it to the
 *   account, so the question does not come back on this or any other device,
 *   and notifications follow the language the person actually reads.
 * - An anonymous guest session is never asked and writes nothing.
 *
 * It runs before the sign-in routes onwards, so onboarding and Home open in
 * the settled language rather than switching under the person.
 */
@Injectable({ providedIn: 'root' })
export class SignInLanguageService {
  private readonly authService = inject(AuthService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly transloco = inject(TranslocoService);
  private readonly alertController = inject(AlertController);

  async reconcile(): Promise<void> {
    const user = this.authService.getUser();

    if (!user || user.isAnonymous) {
      return;
    }

    const settings: Settings | undefined =
      await this.settingsApi.loadSettingsByUserId();
    const current = this.transloco.getActiveLang();
    const account = settings?.language;

    if (account === current) {
      return;
    }

    // No language yet, or one the app no longer ships: nothing to offer, so
    // the account takes the language on screen.
    if (!isShipped(account)) {
      await this.keep(current, settings);
      return;
    }

    if (await this.askToSwitch(account, current)) {
      await this.switchTo(account);
    } else {
      await this.keep(current, settings);
    }
  }

  private async askToSwitch(
    account: string,
    current: string,
  ): Promise<boolean> {
    // The question is asked in the language on screen. Alerts translate
    // synchronously, so its file has to be in memory first (issue #1186).
    await this.loadTranslations(current);

    const accountLanguage = this.languageName(account);
    const currentLanguage = this.languageName(current);

    const alert = await this.alertController.create({
      header: this.transloco.translate('account-language-prompt-header'),
      message: this.transloco.translate('account-language-prompt-message', {
        accountLanguage,
        currentLanguage,
      }),
      buttons: [
        // `cancel` is also the role of a backdrop tap and Android back, so
        // dismissing keeps the language on screen, like this button does.
        { text: currentLanguage, role: 'cancel' },
        { text: accountLanguage, role: 'confirm' },
      ],
    });

    await alert.present();

    const { role } = await alert.onDidDismiss();

    return role === 'confirm';
  }

  private async switchTo(language: string): Promise<void> {
    await this.storeOnDevice(language);
    await this.loadTranslations(language);
    this.transloco.setActiveLang(language);
  }

  private async keep(
    language: string,
    settings: Settings | undefined,
  ): Promise<void> {
    try {
      await this.settingsApi.mergeSettings({ language });
    } catch (error) {
      // The account keeps its old language and asks again next sign-in, which
      // beats holding the person on the login page over it.
      console.warn('Failed to save the language to the account:', error);
      return;
    }

    await this.storeOnDevice(language);

    // A missing document has nothing for the store to merge into; onboarding
    // writes the first full one and reads the language back from it.
    if (settings) {
      this.storeService.notifySavedSettings({ ...settings, language });
    }
  }

  private async storeOnDevice(language: string): Promise<void> {
    try {
      await Preferences.set({ key: LANGUAGE_PREFERENCE_KEY, value: language });
    } catch (error) {
      console.warn('Failed to store the language on this device:', error);
    }
  }

  private async loadTranslations(language: string): Promise<void> {
    try {
      await firstValueFrom(this.transloco.load(language));
    } catch (error) {
      console.warn('Failed to load translations for', language, error);
    }
  }

  private languageName(code: string): string {
    const labelKey = SHIPPED_LANGUAGES.find(
      (option) => option.code === code,
    )?.labelKey;

    return labelKey ? this.transloco.translate(labelKey) : code;
  }
}
