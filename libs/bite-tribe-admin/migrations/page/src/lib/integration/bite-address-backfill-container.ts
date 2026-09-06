import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteAddressBackfill } from '../component/bite-address-backfill/bite-address-backfill';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BiteAddressBackfill],
  template: `
    <lib-bite-address-backfill
      class="ion-page"
      [bites]="service.addressBackfillBites()"
      (backfillBiteAddress)="service.backfillBiteAddress($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class BiteAddressBackfillContainer {
  readonly service = inject(MigrationsService);
}
