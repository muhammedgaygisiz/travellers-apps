import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { Bite } from 'model';

/**
 * Gives a Bite the geohash the proximity queries index on, derived from the
 * position the document already carries.
 *
 * The write lives in data-access; this page picks the target and shows what is
 * still missing one.
 */
@Component({
  selector: 'lib-geohash-migration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonButton, TranslocoPipe],
  templateUrl: './geohash-migration.html',
  styleUrl: '../migration-page.scss',
})
export class GeohashMigration {
  readonly bites = input<Bite[]>([]);

  readonly addGeohash = output<Bite>();
  readonly logoutClick = output<void>();

  readonly bitesWithoutGeohash = computed(() =>
    this.bites().filter((bite) => !bite.geohash),
  );
}
