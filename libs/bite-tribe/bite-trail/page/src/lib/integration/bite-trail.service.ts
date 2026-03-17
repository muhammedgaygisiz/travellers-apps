import { inject, Injectable } from '@angular/core';
import { BiteTrailDataAccessService } from 'bite-tribe/bite-trail-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { Bite, Like } from 'model';
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

  biteClicked(bite: Bite): void {
    void this.navController.navigateForward([PATH.BITE, bite.id]);
  }

  restaurantClicked(bite: Bite): void {
    if (bite.restaurantId) {
      const [, , restaurantId] = bite.restaurantId.split('/');

      void this.navController.navigateForward([
        PATH.BITE,
        bite.id,
        PATH.RESTAURANT,
        restaurantId,
      ]);

      return;
    }

    void this.navController.navigateForward([
      PATH.BITE,
      bite.id,
      PATH.RESTAURANT,
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
}
