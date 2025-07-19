import { computed, inject, Injectable } from '@angular/core';
import { MapDataAccessService } from 'bite-tribe/map-data-access';
import { NavController } from '@ionic/angular/standalone';

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

  logout() {
    this.dataAccess.logout();
  }

  onGotoSettingsClick() {
    this.navController.navigateForward(['settings']);
  }

  onGotoMyBitesClick() {
    this.navController.navigateForward(['my-bites']);
  }

  onGotoMyBucketlists() {
    this.navController.navigateForward(['my-bucketlists']);
  }

  bitesBySelectedBucketlist = computed(() => {
    const bites = this.dataAccess.bites();
    const selectedBucketlist = this.selectedBucketlist();

    if (!selectedBucketlist) {
      return [];
    }

    return bites.filter((bite) =>
      selectedBucketlist.biteIds?.includes(bite.id)
    );
  });
}
