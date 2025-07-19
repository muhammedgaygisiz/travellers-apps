import { computed, inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { Bite } from 'model';
import { NavController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  dataAccess = inject(HomeDataAccessService);
  private readonly navController = inject(NavController);

  bites = this.dataAccess.bites;
  allTags = this.dataAccess.allTags;
  homeFilters = this.dataAccess.homeFilters;
  userId = this.dataAccess.userId;
  isAuthenticated = this.dataAccess.isAuthenticated;
  isBitesLoading = this.dataAccess.isBitesLoading;

  myBites = computed(() => {
    const bites = this.dataAccess.bites();
    const userId = this.dataAccess.userId();

    return bites.filter((bite) => bite.userId === userId);
  });

  selectedBucketlist = this.dataAccess.selectedBucketlist;

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

  selectedBucketlistTitle = computed(() => {
    const selectedBucketlist = this.selectedBucketlist();

    return selectedBucketlist?.name || 'My Bucketlist';
  });

  logout() {
    this.dataAccess.logout();
  }

  likeButtonClicked(likeClick: { likeType: string; biteId: string }) {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite) {
    this.navController.navigateForward(['bite', bite.id]);
  }

  onDeleteBiteClick(bite: Bite) {
    this.dataAccess.deleteBite(bite);
  }

  restaurantClicked(bite: Bite) {
    if (bite.restaurantId) {
      // eslint-disable-next-line no-unused-vars
      const [empty, collectionName, restaurantId] =
        bite.restaurantId.split('/');

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

  onAddButtonClicked() {
    this.navController.navigateForward(['new-bite']);
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

  onGotoEditClick(biteToEdit: Bite) {
    this.navController.navigateForward(['bite', biteToEdit.id, 'edit']);
  }

  openMapView(mainPage: string) {
    if (mainPage === 'my-bucketlists') {
      const selectedBucketlist = this.selectedBucketlist();

      this.navController.navigateForward([
        mainPage,
        selectedBucketlist?.id,
        'map-view',
      ]);
      return;
    }

    this.navController.navigateForward([mainPage, 'map-view']);
  }

  setHomeFilters(filters: string[]) {
    this.dataAccess.setHomeFilters(filters);
  }

  clearHomeFilters() {
    this.dataAccess.clearHomeFilters();
  }

  removeHomeFilter(filterToRemove: string) {
    this.dataAccess.removeHomeFilter(filterToRemove);
  }

  toggleNearbyFilter() {
    this.dataAccess.toggleNearbyFilter();
  }
}
