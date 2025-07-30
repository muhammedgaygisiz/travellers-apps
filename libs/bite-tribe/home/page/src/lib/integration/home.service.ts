import { computed, inject, Injectable, signal } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { Bite } from 'model';
import { NavController } from '@ionic/angular/standalone';
import { sortBitesByLikes } from '../utils/sort-bites-by-likes';
import { sortBitesByDistance } from '../utils/sort-bites-by-distance';
import { sortBitesByCreatedAt } from '../utils/sort-bites-by-created-at';
import { sortBitesByRating } from '../utils/sort-bites-by-rating';
import { sortBitesByPrice } from '../utils/sort-bites-by-price';

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
  private exchangeRates = this.dataAccess.exchangeRates;

  myBites = computed(() => {
    const bites = this.dataAccess.bites();
    const userId = this.dataAccess.userId();

    return bites.filter((bite) => bite.userId === userId);
  });

  sorting = signal('distance');

  selectedBucketlist = this.dataAccess.selectedBucketlist;

  homeDistance = this.dataAccess.homeDistance;

  preferedCurrency = this.dataAccess.preferedCurrency;

  maxPriceHome = this.dataAccess.maxPriceHome;

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

  sortedBites = computed((): Bite[] => {
    const bites = this.bites();
    const sorting = this.sorting();
    const exchangeRates = this.exchangeRates();

    if (!bites?.length || !sorting) {
      return bites;
    }

    if (sorting === 'distance') {
      return sortBitesByDistance(bites);
    }

    if (sorting === 'likes') {
      return sortBitesByLikes(bites);
    }

    if (sorting === 'createdAt') {
      return sortBitesByCreatedAt(bites);
    }

    if (sorting === 'rating') {
      return sortBitesByRating(bites);
    }

    if (sorting === 'price') {
      return sortBitesByPrice(bites, exchangeRates);
    }

    return bites;
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

  sortingChange(value: string) {
    this.sorting.set(value);
  }

  filtersChanged(filters: {
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }) {
    this.dataAccess.setFilters(filters);
  }
}
