import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteImageStatusBackfill } from '../component/bite-image-status-backfill/bite-image-status-backfill';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BiteImageStatusBackfill],
  template: `
    <lib-bite-image-status-backfill
      class="ion-page"
      [state]="service.collectionMigrationState('bite-image-status')"
      (runMigration)="service.runCollectionMigration($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class BiteImageStatusBackfillContainer {
  readonly service = inject(MigrationsService);
}
