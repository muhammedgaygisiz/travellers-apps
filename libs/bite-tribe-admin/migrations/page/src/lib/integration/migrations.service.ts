import { inject, Injectable, signal } from '@angular/core';
import { MigrationsDataAccessService } from 'bite-tribe-admin/migrations-data-access';
import { Bite } from 'model';
import {
  NewVersionNotificationState,
  ReleasePlatform,
} from '../model/new-version-notification';
import {
  CollectionMigrationName,
  CollectionMigrationResult,
  CollectionMigrationState,
  CollectionMigrationStates,
} from '../model/collection-migration';

/**
 * One service behind every operational surface in the admin app.
 *
 * The surfaces are separate pages since issue #1473, but they share one
 * Firestore read of the Bite collection and one set of run states, so splitting
 * this into six services would mean six copies of the same reload handling and
 * a re-read of every Bite per surface.
 */
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

  private readonly collectionMigrationStates =
    signal<CollectionMigrationStates>({});

  collectionMigrations = this.collectionMigrationStates.asReadonly();

  /**
   * Which callable each migration name stands for. Adding a migration means
   * adding a name and its runner, not another copy of the state handling below.
   */
  private readonly migrationRunners: Record<
    CollectionMigrationName,
    () => Promise<CollectionMigrationResult>
  > = {
    'review-timestamps': () => this.dataAccess.backfillReviewTimestamps(),
    'menu-item-ids': () => this.dataAccess.backfillMenuItemIds(),
  };

  /** What the last run of one migration did, or nothing if it never ran here. */
  collectionMigrationState(
    name: CollectionMigrationName,
  ): CollectionMigrationState | undefined {
    return this.collectionMigrations()[name];
  }

  /**
   * Runs one collection-wide migration and keeps what it reported.
   *
   * A failure is kept as state rather than rethrown, for the same reason as the
   * release announcement: this app is the only place these are triggered from,
   * and an operator who just pressed the button needs to see that nothing
   * happened rather than a console error.
   */
  async runCollectionMigration(name: CollectionMigrationName): Promise<void> {
    this.setCollectionMigrationState(name, { status: 'running' });

    try {
      const result = await this.migrationRunners[name]();

      this.setCollectionMigrationState(name, { status: 'done', result });
    } catch (error) {
      console.error(`Failed to run the ${name} migration: `, error);

      this.setCollectionMigrationState(name, { status: 'failed' });
    }
  }

  private setCollectionMigrationState(
    name: CollectionMigrationName,
    state: CollectionMigrationState,
  ): void {
    this.collectionMigrationStates.update((states) => ({
      ...states,
      [name]: state,
    }));
  }

  async clusterRestaurantCandidateForBite(bite: Bite): Promise<void> {
    await this.dataAccess.clusterRestaurantCandidateForBite(bite);
  }

  async backfillBiteAddress(bite: Bite): Promise<void> {
    await this.dataAccess.backfillBiteAddress(bite);
  }

  async migrateBiteImage(bite: Bite): Promise<void> {
    await this.dataAccess.migrateBiteImage(bite);
  }

  async addGeohashToBite(bite: Bite): Promise<void> {
    await this.dataAccess.addGeohashToBite(bite);
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

  logout(): void {
    this.dataAccess.logout();
  }
}
