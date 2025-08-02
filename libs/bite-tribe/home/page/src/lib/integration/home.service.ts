import { inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { Bite } from 'model';
import { NavController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  dataAccess = inject(HomeDataAccessService);
  private readonly navController = inject(NavController);

  sortedHomeBites = this.dataAccess.sortedHomeBites;
  sorting = this.dataAccess.sorting;
  myBites = this.dataAccess.myBites;
  bitesBySelectedBucketlist = this.dataAccess.bitesBySelectedBucketlist;
  allTags = this.dataAccess.allTags;
  homeFilters = this.dataAccess.homeFilters;
  userId = this.dataAccess.userId;
  isAuthenticated = this.dataAccess.isAuthenticated;
  isBitesLoading = this.dataAccess.isBitesLoading;

  selectedBucketlist = this.dataAccess.selectedBucketlist;

  homeDistance = this.dataAccess.homeDistance;

  preferedCurrency = this.dataAccess.preferedCurrency;

  maxPriceHome = this.dataAccess.maxPriceHome;

  selectedBucketlistTitle = this.dataAccess.selectedBucketlistTitle;

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

  sortingChange(value: string) {
    this.dataAccess.setHomeSorting(value);
  }

  filtersChanged(filters: {
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }) {
    this.dataAccess.setFilters(filters);
  }

  filtersCleared() {
    this.dataAccess.clearFilters();
  }
}
