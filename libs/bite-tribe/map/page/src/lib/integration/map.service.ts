import { computed, inject, Injectable, Signal } from '@angular/core';
import { MapDataAccessService } from 'bite-tribe/map-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Bite, Geopoint } from 'model';

@Injectable({ providedIn: 'root' })
export class MapService {
  dataAccess = inject(MapDataAccessService);
  private readonly navController = inject(NavController);

  bites = this.dataAccess.bites;
  myBites = computed(() => {
    const bites = this.dataAccess.bites();
    const userId = this.dataAccess.userId();

    return bites.filter((bite) => bite.userId === userId);
  });
  isAuthenticated = this.dataAccess.isAuthenticated;

  selectedBucketlist = this.dataAccess.selectedBucketlist;

  gpsPosition: Signal<Geopoint | null | undefined> =
    this.dataAccess.gpsPosition;
  userId = this.dataAccess.userId;
  enableZoom = this.dataAccess.userHasSubscriptionTierOne;

  logout(): void {
    this.dataAccess.logout();
  }

  onGotoSettingsClick(): void {
    this.navController.navigateForward(['settings']);
  }

  onGotoMyProfileClick(): void {
    this.navController.navigateForward(['my-profile']);
  }

  onGotoMyBitesClick(): void {
    this.navController.navigateForward(['my-bites']);
  }

  onGotoMyBucketlists(): void {
    this.navController.navigateForward(['my-bucketlists']);
  }

  likeButtonClicked(likeClick: { likeType: string; biteId: string }): void {
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

  bitesBySelectedBucketlist = computed(() => {
    const bites = this.dataAccess.bites();
    const selectedBucketlist = this.selectedBucketlist();

    if (!selectedBucketlist) {
      return [];
    }

    return bites.filter((bite) =>
      selectedBucketlist.biteIds?.includes(bite.id),
    );
  });
}
