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
 * The `menu-item-ids` collection migration as its own operator surface
 * (issue #1099).
 *
 * Menus written before that issue have no ids on their categories, items or
 * variants, which is what makes a menu item unreferenceable: the only way to
 * name one is its name and its position in an array, and both move when an
 * owner edits the menu. This gives each of them a stable id, once.
 *
 * Idempotent like every collection migration here, and for a sharper reason
 * than most: an id that already exists is never replaced, because replacing one
 * would move the target of every order line already pointing at it.
 */
@Component({
  selector: 'lib-menu-item-ids-backfill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, CollectionMigration, TranslocoPipe],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true, enableBackButton: true }"
      [isAuthenticated]="true"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <h2>{{ 'migration-menu-item-ids' | transloco }}</h2>
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
export class MenuItemIdsBackfill {
  readonly state = input<CollectionMigrationState | undefined>(undefined);

  readonly runMigration = output<CollectionMigrationName>();
  readonly logoutClick = output<void>();

  protected readonly migration: CollectionMigrationName = 'menu-item-ids';
}
