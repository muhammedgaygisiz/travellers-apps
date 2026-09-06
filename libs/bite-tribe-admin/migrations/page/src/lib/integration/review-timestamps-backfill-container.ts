import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReviewTimestampsBackfill } from '../component/review-timestamps-backfill/review-timestamps-backfill';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReviewTimestampsBackfill],
  template: `
    <lib-review-timestamps-backfill
      class="ion-page"
      [state]="service.collectionMigrationState('review-timestamps')"
      (runMigration)="service.runCollectionMigration($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class ReviewTimestampsBackfillContainer {
  readonly service = inject(MigrationsService);
}
