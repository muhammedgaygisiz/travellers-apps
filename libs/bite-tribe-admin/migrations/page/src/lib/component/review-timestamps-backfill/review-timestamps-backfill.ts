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
 * The `review-timestamps` collection migration as its own operator surface.
 *
 * The migration itself is unchanged: this is the same idempotent, one-press
 * rewrite, rendered by the shared {@link CollectionMigration} card rather than
 * as a row in a table of every registered migration (issue #1473).
 */
@Component({
  selector: 'lib-review-timestamps-backfill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, CollectionMigration, TranslocoPipe],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true, enableBackButton: true }"
      [isAuthenticated]="true"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <h2>{{ 'migration-review-timestamps' | transloco }}</h2>
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
export class ReviewTimestampsBackfill {
  readonly state = input<CollectionMigrationState | undefined>(undefined);

  readonly runMigration = output<CollectionMigrationName>();
  readonly logoutClick = output<void>();

  protected readonly migration: CollectionMigrationName = 'review-timestamps';
}
