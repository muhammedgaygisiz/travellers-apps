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
      [isPublicProfile]="service.isPublicProfile()"
      (submitSettings)="service.saveSettings($event)"
      (submitPublicUser)="service.saveProfile($event)"
      (goPublic)="service.goPublic()"
      (goPrivate)="service.goPrivate()"
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
  }
}
