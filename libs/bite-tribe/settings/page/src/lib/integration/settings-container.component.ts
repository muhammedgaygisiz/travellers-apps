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
      [emailVerificationResendRunning]="
        service.emailVerificationResendRunning()
      "
      [pushInstallations]="service.pushInstallations()"
      [pushPermission]="service.pushPermission()"
      [pushInstallationsLoading]="service.pushInstallationsLoading()"
      [pushSetupRunning]="service.pushSetupRunning()"
      (submitSettings)="service.saveSettings($event)"
      (logout)="service.logout()"
      (resendEmailVerification)="service.resendEmailVerification('settings')"
      (deleteAccount)="service.goToDeleteAccount()"
      (togglePushInstallation)="
        service.setPushInstallationEnabled($event.token, $event.enabled)
      "
      (enablePushOnThisDevice)="service.enablePushOnThisDevice()"
      (openPushSettings)="service.openPushSettings()"
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

    // Reloaded on every entry: another device may have registered since, and
    // this device's OS permission can be revoked while the app is backgrounded.
    void this.service.refreshPushInstallations();

    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }
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
