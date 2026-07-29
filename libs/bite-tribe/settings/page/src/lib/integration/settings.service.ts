import { inject, Injectable, signal } from '@angular/core';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { Settings } from 'model';
import { NavController, Platform } from '@ionic/angular';
import {
  EmailVerificationService,
  type EmailVerificationSurface,
} from 'bite-tribe/email-verification-data-access';
import { PATH } from 'utils';
import {
  enablePushNotifications,
  getPushPermissionState,
  initPushListeners,
  openPushNotificationSettings,
  type PushPermissionState,
} from 'push-notifications';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  dataAccess = inject(SettingsDataAccessService);
  private readonly navController = inject(NavController);
  private readonly platform = inject(Platform);
  private readonly emailVerification = inject(EmailVerificationService);

  user = this.dataAccess.user;
  publicUser = this.dataAccess.publicUser;
  settings = this.dataAccess.settings;
  emailVerificationPromptVisible = this.emailVerification.promptVisible;
  pushPermissionState = signal<PushPermissionState>('checking');
  pushNotificationsPreference = signal<boolean | undefined>(undefined);
  pushSettingsOpenFailed = signal(false);

  async saveSettings(settings: Settings): Promise<void> {
    await this.dataAccess.saveSettings(settings);

    void this.navController.navigateBack(['home']);
  }

  async refreshPushPermissionState(): Promise<void> {
    this.pushSettingsOpenFailed.set(false);
    this.pushPermissionState.set('checking');

    const state = await getPushPermissionState(this.platform);
    this.pushPermissionState.set(state);

    if (state === 'granted' && this.settings()?.pushNotifications) {
      await initPushListeners(
        this.platform,
        this.user()?.uid,
        this.navController,
        true,
      );
    }
  }

  async setPushNotifications(enabled: boolean): Promise<void> {
    this.pushSettingsOpenFailed.set(false);

    if (!enabled) {
      this.pushNotificationsPreference.set(false);
      return;
    }

    this.pushPermissionState.set('checking');
    const result = await enablePushNotifications(
      this.platform,
      this.user()?.uid,
      this.navController,
    );

    this.pushPermissionState.set(result);
    this.pushNotificationsPreference.set(result === 'granted');
  }

  async openPushSettings(): Promise<void> {
    this.pushSettingsOpenFailed.set(false);

    const opened = await openPushNotificationSettings();
    this.pushSettingsOpenFailed.set(!opened);
  }

  logout(): void {
    this.dataAccess.logout();
  }

  goToDeleteAccount(): void {
    void this.navController.navigateForward([PATH.DELETE_ACCOUNT]);
  }

  trackEmailVerificationPromptShown(surface: EmailVerificationSurface): void {
    this.emailVerification.trackPromptShown(surface);
  }

  resendEmailVerification(surface: EmailVerificationSurface): Promise<void> {
    return this.emailVerification.resend(surface);
  }
}
