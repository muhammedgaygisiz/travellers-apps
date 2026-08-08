import { inject, Injectable } from '@angular/core';
import { BiteTrailDataAccessService } from 'bite-tribe/bite-trail-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { Bite } from 'model';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class BiteTrailService {
  private readonly dataAccess = inject(BiteTrailDataAccessService);
  private readonly navController = inject(NavController);

  bites = this.dataAccess.bitesWithDistance;
  title = this.dataAccess.biteTrailName;
  userId = this.dataAccess.userId;
  isAuthenticated = this.dataAccess.isAuthenticated;
  biteTrailId = this.dataAccess.biteTrailIdFromUrl;
  isFree = this.dataAccess.isFree;
  savedBucketlistId = this.dataAccess.savedBucketlistId;

  /** True once the trail or its Bites could not be read (#1232). */
  hasError = this.dataAccess.bitesFailed;

  /** Runs the failed reads again. */
  retryLoad(): void {
    this.dataAccess.reload();
  }

  biteClicked(bite: Bite): void {
    void this.navController.navigateForward([PATH.BITE, bite.id]);
  }

  openMapView(): void {
    const biteTrailId = this.biteTrailId();

    if (!biteTrailId) {
      return;
    }

    this.navController.navigateForward([
      PATH.BITE_TRAIL,
      biteTrailId,
      'map-view',
    ]);
  }

  getForFree(): void {
    this.dataAccess.saveBiteTrailAsBucketList();
  }

  goToSavedBucketList(): void {
    const bucketlistId = this.savedBucketlistId();

    if (!bucketlistId) {
      return;
    }

    void this.navController.navigateForward([
      PATH.MY_BUCKETLISTS,
      bucketlistId,
    ]);
  }
}
