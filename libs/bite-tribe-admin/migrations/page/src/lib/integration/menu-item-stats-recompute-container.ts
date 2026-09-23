import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MenuItemStatsRecompute } from '../component/menu-item-stats-recompute/menu-item-stats-recompute';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuItemStatsRecompute],
  template: `
    <lib-menu-item-stats-recompute
      class="ion-page"
      [state]="service.collectionMigrationState('menu-item-stats')"
      (runMigration)="service.runCollectionMigration($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class MenuItemStatsRecomputeContainer {
  readonly service = inject(MigrationsService);
}
