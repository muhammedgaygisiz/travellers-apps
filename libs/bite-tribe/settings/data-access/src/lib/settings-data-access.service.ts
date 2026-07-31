import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Settings } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@jsverse/transloco';
import { Platform } from '@ionic/angular';
import {
  enablePushOnThisDevice,
  getInstallationId,
  getPushPermissionState,
  loadPushInstallations,
  openPushSettings,
  setPushInstallationEnabled,
  type PushInstallation,
  type PushPermissionResult,
  type PushPermissionState,
} from 'push-notifications';

@Injectable({
  providedIn: 'root',
})
export class SettingsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly platform = inject(Platform);

  user = toSignal(this.storeService.user$);
  settings = toSignal(this.storeService.settings$);
  publicUser = toSignal(this.storeService.publicUser$);

  /**
   * The signed-in user's registered push installations.
   *
   * Reads go straight to the token documents rather than through the settings
   * document: delivery is a property of an installation, and the settings
   * document never knew about more than one (issue #1184).
   */
  loadPushInstallations(): Promise<PushInstallation[]> {
    const userUid = this.user()?.uid;

    return userUid ? loadPushInstallations(userUid) : Promise.resolve([]);
  }

  async setPushInstallationEnabled(
    token: string,
    enabled: boolean,
  ): Promise<void> {
    const userUid = this.user()?.uid;

    if (!userUid) {
      return;
    }

    await setPushInstallationEnabled(userUid, token, enabled);
  }

  /** Identity of the installation running this code. */
  getInstallationId(): Promise<string> {
    return getInstallationId();
  }

  /** OS notification permission of this device. Never prompts. */
  getPushPermissionState(): Promise<PushPermissionState> {
    return getPushPermissionState(this.platform);
  }

  /**
   * Runs the contextual permission and registration flow for this device.
   *
   * Returns the OS outcome so the page can tell a fresh registration apart from
   * a denial that only the system settings page can undo.
   */
  enablePushOnThisDevice(): Promise<PushPermissionResult> {
    const userUid = this.user()?.uid;

    return userUid
      ? enablePushOnThisDevice(this.platform, userUid)
      : Promise.resolve('unsupported');
  }

  openPushSettings(): Promise<boolean> {
    return openPushSettings();
  }

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
}
