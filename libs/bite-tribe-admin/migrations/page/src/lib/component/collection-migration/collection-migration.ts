import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonButton, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CollectionMigrationName,
  CollectionMigrationState,
} from '../../model/collection-migration';

/**
 * One collection-wide migration: what it does, what its last run reported, and
 * the button that starts it.
 *
 * Generic over the migration name so registering the next one stays a name, a
 * runner and its copy — the contract in `UC - Run Operational Migrations`. Each
 * registered migration is its own operator surface now (issue #1473), and each
 * of those surfaces renders this.
 */
@Component({
  selector: 'lib-collection-migration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonText, TranslocoPipe],
  templateUrl: './collection-migration.html',
  styleUrl: '../migration-page.scss',
})
export class CollectionMigration {
  readonly migration = input.required<CollectionMigrationName>();
  readonly state = input<CollectionMigrationState | undefined>(undefined);

  readonly run = output<CollectionMigrationName>();

  /** True while a run is in flight, so the same migration cannot be doubled up. */
  readonly isRunning = computed(() => this.state()?.status === 'running');

  /**
   * The counts a finished run reported, as label/value pairs.
   *
   * Every result is a flat set of counts, which is what lets one component
   * render any migration's outcome instead of each needing its own markup.
   */
  readonly counts = computed<{ key: string; value: number }[]>(() => {
    const result = this.state()?.result;

    return result
      ? Object.entries(result).map(([key, value]) => ({ key, value }))
      : [];
  });
}
