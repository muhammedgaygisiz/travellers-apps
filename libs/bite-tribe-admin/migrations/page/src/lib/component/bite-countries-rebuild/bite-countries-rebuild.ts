import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import {
  CollectionMigrationName,
  CollectionMigrationState,
} from '../../model/collection-migration';
import { CollectionMigration } from '../collection-migration/collection-migration';

/**
 * The `bite-countries` collection migration as its own operator surface
 * (issue #1893).
 *
 * Rebuilds `meta/biteCountries`, the countries the About page's globe lights
 * up, from every Bite: the first fill of the list, and the repair for anything
 * the triggers that keep it missed.
 */
@Component({
  selector: 'lib-bite-countries-rebuild',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, CollectionMigration, TranslocoPipe],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true, enableBackButton: true }"
      [isAuthenticated]="true"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <h2>{{ 'migration-bite-countries' | transloco }}</h2>
        <p>{{ 'collection-migrations-hint' | transloco }}</p>

        <lib-collection-migration
          [migration]="migration"
          [state]="state()"
          (run)="runMigration.emit($event)"
        />
      </ion-content>
    </ta-page>
  `,
})
export class BiteCountriesRebuild {
  readonly state = input<CollectionMigrationState | undefined>(undefined);

  readonly runMigration = output<CollectionMigrationName>();
  readonly logoutClick = output<void>();

  protected readonly migration: CollectionMigrationName = 'bite-countries';
}
