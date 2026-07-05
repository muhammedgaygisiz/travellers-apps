import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Migrations } from '../component/page/migrations';
import { MigrationsService } from './migrations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Migrations],
  template: `
    <btb-migrations
      class="ion-page"
      [bites]="service.bites()"
      [addressBackfillBites]="service.addressBackfillBites()"
      [restaurantClusteringEligibleBites]="
        service.restaurantClusteringEligibleBites()
      "
      (clusterRestaurantCandidate)="
        service.clusterRestaurantCandidateForBite($event)
      "
      (backfillBiteAddress)="service.backfillBiteAddress($event)"
    />
  `,
})
export class MigrationsContainer {
  service = inject(MigrationsService);
}
