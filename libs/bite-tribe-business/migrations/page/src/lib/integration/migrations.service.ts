import { inject, Injectable, signal } from '@angular/core';
import { MigrationsDataAccessService } from 'bite-tribe-business/migrations-data-access';
import {
  NewVersionNotificationState,
  ReleasePlatform,
} from '../component/page/new-version-notification';

@Injectable({ providedIn: 'root' })
export class MigrationsService {
  private readonly dataAccess = inject(MigrationsDataAccessService);

  bites = this.dataAccess.bites;
  addressBackfillBites = this.dataAccess.addressBackfillBites;
  restaurantClusteringEligibleBites =
    this.dataAccess.restaurantClusteringEligibleBites;

  private readonly newVersionNotificationState =
    signal<NewVersionNotificationState | null>(null);

  newVersionNotification = this.newVersionNotificationState.asReadonly();

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

  /**
   * Announces the released version to one store's installations.
   *
   * A failure is kept as state rather than rethrown: this page is the only
   * place the announcement is triggered from, and an operator who just pressed
   * the button needs to see that nothing went out, not a console error.
   */
  async sendNewVersionNotification(platform: ReleasePlatform): Promise<void> {
    this.newVersionNotificationState.set({ platform, status: 'sending' });

    try {
      const result = await this.dataAccess.sendNewVersionNotification(platform);

      this.newVersionNotificationState.set({
        platform,
        status: 'sent',
        result,
      });
    } catch (error) {
      console.error('Failed to send the new version notification: ', error);

      this.newVersionNotificationState.set({ platform, status: 'failed' });
    }
  }
}
