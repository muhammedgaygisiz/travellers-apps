import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { PageSettings } from '../components/page/settings.component';
import { SettingsService } from './settings.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <settings
      class="ion-page"
      [user]="service.user()"
      [publicUser]="service.publicUser()"
      [settings]="service.settings()"
      [showEmailVerificationPrompt]="service.emailVerificationPromptVisible()"
      [pushPermissionState]="service.pushPermissionState()"
      [pushNotificationsPreference]="service.pushNotificationsPreference()"
      [pushSettingsOpenFailed]="service.pushSettingsOpenFailed()"
      (submitSettings)="service.saveSettings($event)"
      (pushNotificationsChange)="service.setPushNotifications($event)"
      (openPushSettings)="service.openPushSettings()"
      (refreshPushPermission)="service.refreshPushPermissionState()"
      (logout)="service.logout()"
      (resendEmailVerification)="service.resendEmailVerification('settings')"
      (deleteAccount)="service.goToDeleteAccount()"
    />
  `,
  imports: [PageSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsContainer {
  service = inject(SettingsService);

  private hasTrackedPrompt = false;

  private readonly trackPromptEffect = effect(() => {
    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }
  });

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Settings',
    });

    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }

    void this.service.refreshPushPermissionState();
  }

  ionViewDidLeave(): void {
    this.hasTrackedPrompt = false;
  }

  private trackPromptShownOnce(): void {
    if (this.hasTrackedPrompt) {
      return;
    }

    this.hasTrackedPrompt = true;
    this.service.trackEmailVerificationPromptShown('settings');
  }
}
