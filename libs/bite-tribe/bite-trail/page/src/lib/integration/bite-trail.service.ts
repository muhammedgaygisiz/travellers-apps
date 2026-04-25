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

  biteClicked(bite: Bite): void {
    void this.navController.navigateForward([PATH.BITE, bite.id]);
  }

  restaurantClicked(bite: Bite): void {
    if (bite.id && bite.restaurantId) {
      void this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        bite.restaurantId,
      ]);

      return;
    }

    void this.navController.navigateForward([
      'bite',
      bite.id,
      PATH.RESTAURANT,
      PATH.PLACE,
      encodeURIComponent(bite.place),
    ]);
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
