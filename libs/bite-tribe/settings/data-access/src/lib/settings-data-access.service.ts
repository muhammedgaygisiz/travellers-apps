import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Settings } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@jsverse/transloco';
import { Platform } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { HapticsService } from 'haptics';
import {
  enablePushOnThisDevice,
  getPushPermissionState,
  loadPushInstallations,
  openPushSettings,
  readInstallationId,
  setPushInstallationEnabled,
  type PushInstallation,
  type PushPermissionResult,
  type PushPermissionState,
} from 'push-notifications';
import {
  getMediaLocationPermissionState,
  openMediaLocationSettings,
  requestMediaLocationPermission,
  type MediaLocationPermissionResult,
  type MediaLocationPermissionState,
} from 'media-location';

@Injectable({
  providedIn: 'root',
})
export class SettingsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly platform = inject(Platform);
  private readonly haptics = inject(HapticsService);

  user = toSignal(this.storeService.user$);
  settings = toSignal(this.storeService.settings$);
  publicUser = toSignal(this.storeService.publicUser$);

  /**
   * Whether this device plays the app's haptic feedback. A device setting, not
   * an account one: it is kept in device `Preferences` by `HapticsService` and
   * never reaches the settings document (issue #1746).
   */
  hapticsEnabled = this.haptics.enabled;

  /** Haptics are a no-op off a native build, so the web has nothing to switch. */
  readonly hapticsSupported = Capacitor.isNativePlatform();

  /** Applies at once, and survives a restart. */
  setHapticsEnabled(enabled: boolean): Promise<void> {
    return this.haptics.setEnabled(enabled);
  }

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

  /**
   * Identity of the installation running this code, if it has one.
   *
   * Deliberately the non-creating read: listing devices must not mint an
   * installation id on a surface that can never register a token, such as the
   * web build. `undefined` matches no row, which is the truthful outcome there.
   */
  readInstallationId(): Promise<string | undefined> {
    return readInstallationId();
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

  /** OS media location permission of this device. Never prompts. */
  getMediaLocationPermissionState(): Promise<MediaLocationPermissionState> {
    return getMediaLocationPermissionState();
  }

  /**
   * Runs the contextual media location request for this device.
   *
   * The onboarding photos step is where most users answer this. Settings is the
   * recovery surface for everyone who skipped it, revoked it, or onboarded
   * before the step existed (issue #1394).
   */
  requestMediaLocationPermission(): Promise<MediaLocationPermissionResult> {
    return requestMediaLocationPermission();
  }

  openMediaLocationSettings(): Promise<boolean> {
    return openMediaLocationSettings();
  }

  /**
   * Persists the settings document and applies the language in place.
   *
   * This used to end in a full `document.location.reload()` so the new language
   * reached already-rendered text. Transloco has re-rendered on every language
   * change since #1186, so the reload only restarted the app and destroyed the
   * save confirmation on its way out (#1217).
   */
  async saveSettings(settings: Settings): Promise<void> {
    await this.saveLanguageToPreferences(settings.language);

    await this.api.saveSettings(settings);

    this.storeService.notifySavedSettings(settings);

    await this.setLanguage(settings.language);
  }

  private saveLanguageToPreferences(language = 'en'): Promise<void> {
    return Preferences.set({
      key: 'lang',
      value: language,
    });
  }

  /**
   * Applies the language in place, once its translations are in memory.
   *
   * `setActiveLang` only announces the new language, so anything translated
   * synchronously right after - the save confirmation - would render its raw
   * key while the file is still in flight (issue #1186). The full reload used
   * to hide this; without it the load has to be awaited, as onboarding already
   * does. Loads are cached per language, so an unchanged language costs
   * nothing.
   */
  private async setLanguage(language = 'en'): Promise<void> {
    try {
      await firstValueFrom(this.transloco.load(language));
    } catch (error) {
      // A failed load still switches: Transloco falls back to the fallback
      // language rather than stranding the user on the language they replaced.
      console.warn('Failed to load translations for the new language:', error);
    }

    this.transloco.setActiveLang(language);
  }

  logout(): void {
    this.storeService.logout();
  }
}
