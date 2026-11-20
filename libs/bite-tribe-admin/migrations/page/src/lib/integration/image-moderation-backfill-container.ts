import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ImageModerationBackfill } from '../component/image-moderation-backfill/image-moderation-backfill';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImageModerationBackfill],
  template: `
    <lib-image-moderation-backfill
      class="ion-page"
      [reportState]="
        service.collectionMigrationState('image-moderation-report')
      "
      [applyState]="
        service.collectionMigrationState('image-moderation-backfill')
      "
      (runMigration)="service.runCollectionMigration($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class ImageModerationBackfillContainer {
  readonly service = inject(MigrationsService);
}
