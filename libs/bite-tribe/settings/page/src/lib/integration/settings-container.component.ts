import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PageSettings } from '../components/page/settings.component';
import { SettingsService } from './settings.service';

@Component({
  template: ` <settings class="ion-page" [user]="service.user()" /> `,
  imports: [PageSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class SettingsContainer {
  service = inject(SettingsService);
}
