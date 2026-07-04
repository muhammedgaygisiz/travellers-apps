import { inject, Injectable } from '@angular/core';
import { MigrationsDataAccessService } from 'bite-tribe-business/migrations-data-access';

@Injectable({ providedIn: 'root' })
export class MigrationsService {
  private readonly dataAccess = inject(MigrationsDataAccessService);

  bites = this.dataAccess.bites;
  restaurantClusteringEligibleBites =
    this.dataAccess.restaurantClusteringEligibleBites;

  async clusterRestaurantCandidateForBite(
    bite: Parameters<
      MigrationsDataAccessService['clusterRestaurantCandidateForBite']
    >[0],
  ): Promise<void> {
    await this.dataAccess.clusterRestaurantCandidateForBite(bite);
  }

  async backfillBiteAddress(
    bite: Parameters<MigrationsDataAccessService['backfillBiteAddress']>[0],
  ): Promise<void> {
    await this.dataAccess.backfillBiteAddress(bite);
  }
}
