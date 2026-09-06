import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { Bite } from 'model';

/**
 * Clusters a Bite into a restaurant candidate, one Bite at a time.
 *
 * The eligible set is computed in data-access, because "eligible" is a query
 * over both Bites and the pending candidates rather than a display rule.
 */
@Component({
  selector: 'lib-restaurant-clustering',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonButton, TranslocoPipe],
  templateUrl: './restaurant-clustering.html',
  styleUrl: '../migration-page.scss',
})
export class RestaurantClustering {
  readonly bites = input<Bite[]>([]);

  readonly clusterRestaurantCandidate = output<Bite>();
  readonly logoutClick = output<void>();

  clusteringState(bite: Bite): string {
    return bite.geohash
      ? 'restaurant-clustering-state-ready'
      : 'restaurant-clustering-state-missing-geohash';
  }
}
