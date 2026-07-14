import { computed, inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Settings } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class SettingsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);
  private readonly transloco = inject(TranslocoService);

  user = toSignal(this.storeService.user$);
  settings = toSignal(this.storeService.settings$);
  publicUser = toSignal(this.storeService.publicUser$);
  emailVerificationPromptVisible = computed(() => {
    const publicUser = this.publicUser();

    return (
      publicUser?.emailVerificationRequired === true &&
      publicUser.emailVerified !== true
    );
  });

  async saveSettings(settings: Settings): Promise<void> {
    await this.saveLanguageToPreferences(settings.language);

    await this.api.saveSettings(settings);

    this.storeService.notifySavedSettings(settings);

    this.setLanguage(settings.language);

    document.location.reload();
  }

  private saveLanguageToPreferences(language = 'en'): Promise<void> {
    return Preferences.set({
      key: 'lang',
      value: language,
    });
  }

  private setLanguage(language = 'en'): void {
    this.transloco.setActiveLang(language);
  }

  logout(): void {
    this.storeService.logout();
  }

  async resendEmailVerification(): Promise<void> {
    await this.api.resendEmailVerification();
  }
}
