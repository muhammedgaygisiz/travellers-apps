import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { PublicUser, Settings } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class SettingsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  user = toSignal(this.storeService.user$);
  settings = toSignal(this.storeService.settings$);
  publicUser = toSignal(this.storeService.publicUser$);

  async saveSettings(settings: Settings): Promise<void> {
    await this.saveLanguageToPreferences(settings.language);

    this.api.saveSettings(settings);

    this.storeService.notifySavedSettings(settings);
  }

  private saveLanguageToPreferences(language = 'en'): Promise<void> {
    return Preferences.set({
      key: 'lang',
      value: language,
    });
  }
}
