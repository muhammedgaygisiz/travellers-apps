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
  triedOutBiteIds = this.dataAccess.triedOutBiteIds;

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

  rateNowClicked(params: { bite: Bite; rating: number }): void {
    this.dataAccess.updateBiteRating(params);
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

  onAddButtonClicked(): void {
    void this.navController.navigateForward(['new-bite']);
  }

  onGotoSettingsClick(): void {
    void this.navController.navigateForward(['settings']);
  }

  onGotoMyBitesClick(): void {
    void this.navController.navigateForward(['my-bites']);
  }

  onGotoMyBucketlists(): void {
    void this.navController.navigateForward(['my-bucketlists']);
  }

  onGotoEditClick(biteToEdit: Bite): void {
    void this.navController.navigateForward(['bite', biteToEdit.id, 'edit']);
  }

  onGotoAboutClick(): void {
    void this.navController.navigateForward([PATH.ABOUT]);
  }

  onGotoMarketPlaceClick(): void {
    void this.navController.navigateForward([PATH.MARKET_PLACE]);
  }

  onGotoGalleryClick(): void {
    void this.navController.navigateForward([PATH.GALLERY]);
  }

  onGotoLeaderboardClick(): void {
    void this.navController.navigateForward([PATH.LEADERBOARD]);
  }

  onGotoSearchClick(): void {
    void this.navController.navigateForward([PATH.SEARCH]);
  }

  openMapView(mainPage: string): void {
    if (mainPage === 'my-bucketlists') {
      const selectedBucketlist = this.selectedBucketlist();

      void this.navController.navigateForward([
        mainPage,
        selectedBucketlist?.id,
        'map-view',
      ]);
      return;
    }

    void this.navController.navigateForward([mainPage, 'map-view']);
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

  toggleTriedOut(params: { biteId: string; checked: boolean }): void {
    this.dataAccess.markBiteAsTriedOut(params);
  }

  onGotoMyProfileClick(): void {
    void this.navController.navigateForward(['my-profile']);
  }
}
