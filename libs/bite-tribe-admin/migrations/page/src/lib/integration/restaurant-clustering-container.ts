import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantClustering } from '../component/restaurant-clustering/restaurant-clustering';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantClustering],
  template: `
    <lib-restaurant-clustering
      class="ion-page"
      [bites]="service.restaurantClusteringEligibleBites()"
      (clusterRestaurantCandidate)="
        service.clusterRestaurantCandidateForBite($event)
      "
      (logoutClick)="service.logout()"
    />
  `,
})
export class RestaurantClusteringContainer {
  readonly service = inject(MigrationsService);
}
