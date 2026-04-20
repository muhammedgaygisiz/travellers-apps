import { inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import type { Bite, Like } from 'model';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  dataAccess = inject(HomeDataAccessService);
  private readonly navController = inject(NavController);

  sortedHomeBites = this.dataAccess.sortedHomeBites;
  imageUploads = this.dataAccess.imageUploads;
  sorting = this.dataAccess.sorting;
  myBites = this.dataAccess.myBites;
  myBitesSorting = this.dataAccess.myBitesSorting;
  restaurantBites = this.dataAccess.restaurantBites;
  restaurantBitesSorting = this.dataAccess.restaurantBitesSorting;
  bitesBySelectedBucketlist = this.dataAccess.bitesBySelectedBucketlist;
  allTags = this.dataAccess.allTags;
  homeFilters = this.dataAccess.homeFilters;
  userId = this.dataAccess.userId;
  isAuthenticated = this.dataAccess.isAuthenticated;
  isBitesLoading = this.dataAccess.isBitesLoading;
  biteById = this.dataAccess.biteById;

  selectedBucketlist = this.dataAccess.selectedBucketlist;

  homeDistance = this.dataAccess.homeDistance;

  preferedCurrency = this.dataAccess.preferedCurrency;

  maxPriceHome = this.dataAccess.maxPriceHome;

  selectedBucketlistTitle = this.dataAccess.selectedBucketlistTitle;

  isReloading = this.dataAccess.isReloading;

  hasErrorLoadingGpsPosition = this.dataAccess.hasErrorLoadingGpsPosition;

  networkStatus = this.dataAccess.networkStatus;

  logout(): void {
    this.dataAccess.logout();
  }

  likeButtonClicked(likeClick: Like): void {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }

  onDeleteBiteClick(bite: Bite): void {
    this.dataAccess.deleteBite(bite);
  }

  restaurantClicked(bite: Bite): void {
    if (bite.restaurantId) {
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

  onAddButtonClicked(): void {
    this.navController.navigateForward(['new-bite']);
  }

  onGotoSettingsClick(): void {
    this.navController.navigateForward(['settings']);
  }

  onGotoMyBitesClick(): void {
    this.navController.navigateForward(['my-bites']);
  }

  onGotoMyBucketlists(): void {
    this.navController.navigateForward(['my-bucketlists']);
  }

  onGotoEditClick(biteToEdit: Bite): void {
    this.navController.navigateForward(['bite', biteToEdit.id, 'edit']);
  }

  onGotoAboutClick(): void {
    this.navController.navigateForward([PATH.ABOUT]);
  }

  onGotoMarketPlaceClick(): void {
    this.navController.navigateForward([PATH.MARKET_PLACE]);
  }

  openMapView(mainPage: string): void {
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

  sortingChange(value: string): void {
    this.dataAccess.setHomeSorting(value);
  }

  myBitesSortingChange(value: string): void {
    this.dataAccess.setMyBitesSorting(value);
  }

  restaurantBitesSortingChange(value: string): void {
    this.dataAccess.setRestaurantBitesSorting(value);
  }

  filtersChanged(filters: {
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }): void {
    this.dataAccess.setFilters(filters);
  }

  filtersCleared(): void {
    this.dataAccess.clearFilters();
  }

  refresh(): void {
    this.dataAccess.reloadGPSPosition();
  }

  closeGpsError(): void {
    this.dataAccess.clearGpsError();
  }

  toggleTriedOut(params: { bite: Bite; checked: boolean }): void {
    this.dataAccess.markBiteAsTriedOut(params);
  }

  onGotoMyProfileClick(): void {
    this.navController.navigateForward(['my-profile']);
  }
}
