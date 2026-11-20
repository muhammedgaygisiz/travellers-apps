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
 * The stored-photo backfill as its own operator surface (issue #2143).
 *
 * Every photo published before the image check existed is checked once. It
 * runs in two passes, one card each, by the maintainer's decision: the report
 * changes nothing and lists what the check refuses in the operator log, and
 * only then does the apply pass take those photos down the way a refused
 * upload is. The callable refuses the apply pass until a report has finished.
 */
@Component({
  selector: 'lib-image-moderation-backfill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, CollectionMigration, TranslocoPipe],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true, enableBackButton: true }"
      [isAuthenticated]="true"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <h2>{{ 'admin-tool-image-moderation-backfill' | transloco }}</h2>
        <p>{{ 'image-moderation-backfill-hint' | transloco }}</p>

        <lib-collection-migration
          [migration]="report"
          [state]="reportState()"
          (run)="runMigration.emit($event)"
        />
        <lib-collection-migration
          [migration]="apply"
          [state]="applyState()"
          (run)="runMigration.emit($event)"
        />
      </ion-content>
    </ta-page>
  `,
})
export class ImageModerationBackfill {
  readonly reportState = input<CollectionMigrationState | undefined>(undefined);
  readonly applyState = input<CollectionMigrationState | undefined>(undefined);

  readonly runMigration = output<CollectionMigrationName>();
  readonly logoutClick = output<void>();

  protected readonly report: CollectionMigrationName =
    'image-moderation-report';
  protected readonly apply: CollectionMigrationName =
    'image-moderation-backfill';
}
