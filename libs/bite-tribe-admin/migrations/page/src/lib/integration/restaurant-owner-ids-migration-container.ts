import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantOwnerIdsMigration } from '../component/restaurant-owner-ids-migration/restaurant-owner-ids-migration';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantOwnerIdsMigration],
  template: `
    <lib-restaurant-owner-ids-migration
      class="ion-page"
      [state]="service.collectionMigrationState('restaurant-owner-ids')"
      (runMigration)="service.runCollectionMigration($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class RestaurantOwnerIdsMigrationContainer {
  readonly service = inject(MigrationsService);
}
