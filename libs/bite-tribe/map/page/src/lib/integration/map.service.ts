import { computed, inject, Injectable, Signal } from '@angular/core';
import { MapDataAccessService } from 'bite-tribe/map-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { Bite, Geopoint, Like } from 'model';

@Injectable({ providedIn: 'root' })
export class MapService {
  dataAccess = inject(MapDataAccessService);
  private readonly navController = inject(NavController);

  bites = this.dataAccess.bites;
  bitesBySelectedBucketlist = this.dataAccess.bitesBySelectedBucketlist;
  myBites = this.dataAccess.myBites;
  isAuthenticated = this.dataAccess.isAuthenticated;

  selectedBucketlist = this.dataAccess.selectedBucketlist;

  gpsPosition: Signal<Geopoint | null | undefined> =
    this.dataAccess.gpsPosition;
  userId = this.dataAccess.userId;
  enableZoom = this.dataAccess.userHasSubscriptionTierOne;

  logout(): void {
    this.dataAccess.logout();
  }

  likeButtonClicked(likeClick: Like): void {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }

  restaurantClicked(bite: Bite): void {
    if (bite.restaurantId) {
      const [, , restaurantId] = bite.restaurantId.split('/');

      this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        restaurantId,
      ]);

      return;
    }

    this.navController.navigateForward([
      'bite',
      bite.id,
      'restaurant',
      encodeURIComponent(bite.place),
    ]);
  }
}
