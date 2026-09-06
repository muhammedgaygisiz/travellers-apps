import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GeohashMigration } from '../component/geohash-migration/geohash-migration';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GeohashMigration],
  template: `
    <lib-geohash-migration
      class="ion-page"
      [bites]="service.bites()"
      (addGeohash)="service.addGeohashToBite($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class GeohashMigrationContainer {
  readonly service = inject(MigrationsService);
}
