import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NewVersionNotification } from '../component/new-version-notification/new-version-notification';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NewVersionNotification],
  template: `
    <lib-new-version-notification
      class="ion-page"
      [notification]="service.newVersionNotification()"
      (sendNewVersionNotification)="service.sendNewVersionNotification($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class NewVersionNotificationContainer {
  readonly service = inject(MigrationsService);
}
