import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MenuItemIdsBackfill } from '../component/menu-item-ids-backfill/menu-item-ids-backfill';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuItemIdsBackfill],
  template: `
    <lib-menu-item-ids-backfill
      class="ion-page"
      [state]="service.collectionMigrationState('menu-item-ids')"
      (runMigration)="service.runCollectionMigration($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class MenuItemIdsBackfillContainer {
  readonly service = inject(MigrationsService);
}
