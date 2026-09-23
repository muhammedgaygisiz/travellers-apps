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
 * The `menu-item-stats` resync as its own operator surface (issue #1113).
 *
 * A dish's Bite count and average rating are kept by Firestore triggers with
 * `increment`, which is atomic and costs one write - and cannot repair. A
 * missed event, an exception halfway through, or a Bite written by a migration
 * that bypassed the trigger leaves a number that is wrong and stays wrong,
 * because nothing else ever reads the Bites of that dish again.
 *
 * This walks them and writes the answer. Idempotent like every migration here,
 * and unusually safe to press twice: it replaces rather than adds.
 */
@Component({
  selector: 'lib-menu-item-stats-recompute',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, CollectionMigration, TranslocoPipe],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true, enableBackButton: true }"
      [isAuthenticated]="true"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <h2>{{ 'migration-menu-item-stats' | transloco }}</h2>
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
export class MenuItemStatsRecompute {
  readonly state = input<CollectionMigrationState | undefined>(undefined);

  readonly runMigration = output<CollectionMigrationName>();
  readonly logoutClick = output<void>();

  protected readonly migration: CollectionMigrationName = 'menu-item-stats';
}
