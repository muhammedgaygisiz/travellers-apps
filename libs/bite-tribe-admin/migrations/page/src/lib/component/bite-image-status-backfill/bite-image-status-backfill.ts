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
 * The `bite-image-status` collection migration as its own operator surface
 * (issue #1717).
 *
 * Bites written before the upload states of issue #1168 carry no
 * `imageStatus`, and only `uploaded` Bites are offered to anybody but their
 * poster. This marks each of them `uploaded` or `failed` from what Storage
 * actually holds, once, before that rule goes live.
 */
@Component({
  selector: 'lib-bite-image-status-backfill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, CollectionMigration, TranslocoPipe],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true, enableBackButton: true }"
      [isAuthenticated]="true"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <h2>{{ 'migration-bite-image-status' | transloco }}</h2>
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
export class BiteImageStatusBackfill {
  readonly state = input<CollectionMigrationState | undefined>(undefined);

  readonly runMigration = output<CollectionMigrationName>();
  readonly logoutClick = output<void>();

  protected readonly migration: CollectionMigrationName = 'bite-image-status';
}
