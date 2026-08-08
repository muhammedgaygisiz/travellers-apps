import { inject, Injectable } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LocalImagePickerService } from 'bite-tribe-common/bite';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import type { Bite, LikeClick } from 'model';
import { NavController } from '@ionic/angular/standalone';
import type { PageMenuTarget } from 'common/ui/page';
import { PATH } from 'utils';
import {
  EmailVerificationService,
  type EmailVerificationSurface,
} from 'bite-tribe/email-verification-data-access';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  dataAccess = inject(HomeDataAccessService);
  private readonly biteDataAccess = inject(BiteDataAccessService);
  private readonly localImagePicker = inject(LocalImagePickerService);
  private readonly navController = inject(NavController);
  private readonly emailVerification = inject(EmailVerificationService);

  sortedHomeBites = this.dataAccess.sortedHomeBites;
  sorting = this.dataAccess.sorting;
  myBites = this.dataAccess.myBites;
  myBitesSorting = this.dataAccess.myBitesSorting;
  restaurantBites = this.dataAccess.restaurantBites;
  restaurantBitesLoading = this.dataAccess.restaurantBitesLoading;
  restaurantBitesFailed = this.dataAccess.restaurantBitesFailed;
  restaurantBitesSorting = this.dataAccess.restaurantBitesSorting;
  weeklyBites = this.dataAccess.weeklyBites;
  weeklyBitesLoading = this.dataAccess.weeklyBitesLoading;
  weeklyBitesFailed = this.dataAccess.weeklyBitesFailed;
  weeklyBitesSorting = this.dataAccess.weeklyBitesSorting;
  weeklyBitesRange = this.dataAccess.weeklyBitesRange;
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
  hasErrorLoadingBites = this.dataAccess.hasErrorLoadingBites;
  locationPermissionState = this.dataAccess.locationPermissionState;

  networkStatus = this.dataAccess.networkStatus;
  emailVerificationPromptVisible = this.emailVerification.promptVisible;
  emailVerificationResendRunning = this.emailVerification.resendRunning;

  logout(): void {
    this.dataAccess.logout();
  }

  likeButtonClicked(likeClick: LikeClick): void {
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

  onMenuNavigate(target: PageMenuTarget): void {
    switch (target) {
      case 'settings':
        this.onGotoSettingsClick();
        break;
      case 'profile':
        this.onGotoMyProfileClick();
        break;
      case 'my-bites':
        this.onGotoMyBitesClick();
        break;
      case 'my-bucketlists':
        this.onGotoMyBucketlists();
        break;
      case 'about':
        this.onGotoAboutClick();
        break;
      case 'market-place':
        this.onGotoMarketPlaceClick();
        break;
      case 'gallery':
        this.onGotoGalleryClick();
        break;
      case 'leaderboard':
        this.onGotoLeaderboardClick();
        break;
    }
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

  weeklyBitesSortingChange(value: string): void {
    this.dataAccess.setWeeklyBitesSorting(value);
  }

  reloadWeeklyBites(): void {
    this.dataAccess.reloadWeeklyBites();
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

  /**
   * Refreshes the restaurant Bite list, which has its own resource rather than
   * the store-backed feed. The shared `refresh` only reloads the position, which
   * left the error card on this page offering a retry that could not retry the
   * read that actually failed. The weekly list already has `reloadWeeklyBites`.
   * See GitHub issue #1232.
   */
  refreshRestaurantBites(): void {
    this.refresh();
    this.dataAccess.restaurantBitesResource.reload();
  }

  closeGpsError(): void {
    this.dataAccess.clearGpsError();
  }

  /**
   * Recovers location access from the error card.
   *
   * The onboarding assistant owns the first ask, but it only runs once: a user
   * who reinstalls, restores to a new device, or revokes access in system
   * settings lands back here with no position and no way to fix it. Which route
   * works depends on the OS state — an unspent prompt can still be asked for,
   * while a denial is only reversible in the settings page.
   */
  async enableLocation(): Promise<void> {
    const state = await this.dataAccess.getLocationPermissionState();

    if (state === 'denied') {
      await this.dataAccess.openLocationSettings();
      return;
    }

    if (state === 'prompt') {
      const result = await this.dataAccess.requestLocationPermission();

      if (result !== 'granted') {
        return;
      }
    }

    // Granted here, or never gated (web asks on read): the error is stale, so
    // clear it and re-read rather than leaving the card up.
    this.dataAccess.clearGpsError();
    this.dataAccess.reloadGPSPosition();
  }

  toggleTriedOut(params: { biteId: string; checked: boolean }): void {
    this.dataAccess.markBiteAsTriedOut(params);
  }

  onGotoMyProfileClick(): void {
    void this.navController.navigateForward(['my-profile']);
  }

  trackEmailVerificationPromptShown(surface: EmailVerificationSurface): void {
    this.emailVerification.trackPromptShown(surface);
  }

  resendEmailVerification(surface: EmailVerificationSurface): Promise<void> {
    return this.emailVerification.resend(surface);
  }

  /**
   * Re-sends a Bite photo whose upload never made it, in one of two flows
   * depending on whether this device still holds the Bite's own copy: a recent
   * Bite posted from here is re-sent straight away, while an older one — or one
   * posted from another device — asks the user to pick from the photos saved
   * locally, the same set the gallery shows. Picking nothing cancels.
   *
   * Presenting the picker is a workflow decision, so it lives here rather than
   * in the card that raised the request. See GitHub issue #1168.
   */
  async retryBiteImageUpload(bite: Bite): Promise<void> {
    const localCopy = await this.biteDataAccess.findLocalImageForBite(bite.id);
    const fileUri = localCopy?.uri ?? (await this.localImagePicker.pick())?.uri;

    if (fileUri) {
      await this.biteDataAccess.retryImageUpload(bite, fileUri);
    }
  }
}
