import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
      (submitSettings)="service.saveSettings($event)"
      (logout)="service.logout()"
      (resendEmailVerification)="service.resendEmailVerification('settings')"
    />
  `,
  imports: [PageSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsContainer {
  service = inject(SettingsService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Settings',
    });
    this.service.trackEmailVerificationPromptShown('settings');
  }
}
