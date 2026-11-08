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
 * The `restaurant-owner-ids` collection migration as its own operator surface
 * (epic #1614, issue #1752).
 *
 * It moves each restaurant's single owner into the owner set. Every reader
 * accepts either field until issue #1754 removes the single one, and that
 * removal is only safe once this has run in production and reported no
 * conflicting restaurants.
 */
@Component({
  selector: 'lib-restaurant-owner-ids-migration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, CollectionMigration, TranslocoPipe],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true, enableBackButton: true }"
      [isAuthenticated]="true"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <h2>{{ 'migration-restaurant-owner-ids' | transloco }}</h2>
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
export class RestaurantOwnerIdsMigration {
  readonly state = input<CollectionMigrationState | undefined>(undefined);

  readonly runMigration = output<CollectionMigrationName>();
  readonly logoutClick = output<void>();

  protected readonly migration: CollectionMigrationName =
    'restaurant-owner-ids';
}
