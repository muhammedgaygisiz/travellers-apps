import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ImageMigration } from '../component/image-migration/image-migration';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImageMigration],
  template: `
    <lib-image-migration
      class="ion-page"
      [bites]="service.bites()"
      (migrateImage)="service.migrateBiteImage($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class ImageMigrationContainer {
  readonly service = inject(MigrationsService);
}
