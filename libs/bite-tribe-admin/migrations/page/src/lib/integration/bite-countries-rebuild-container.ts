import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteCountriesRebuild } from '../component/bite-countries-rebuild/bite-countries-rebuild';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BiteCountriesRebuild],
  template: `
    <lib-bite-countries-rebuild
      class="ion-page"
      [state]="service.collectionMigrationState('bite-countries')"
      (runMigration)="service.runCollectionMigration($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class BiteCountriesRebuildContainer {
  readonly service = inject(MigrationsService);
}
