import {
  computed,
  inject,
  Injectable,
  resource,
  ResourceLoader,
} from '@angular/core';
import { BiteTribeStoreService, sortByCriteria } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Bite, Like, LikeClick, Restaurant } from 'model';
import { NetworkStatusService } from 'common/networkstatus';
import { BiteTribeApiService } from 'bite-tribe/api';
import { getSimilarityScore, haversineDistance, normalize } from 'utils';
import {
  getLocationPermissionState,
  openLocationSettings,
  requestLocationPermission,
  type LocationPermissionResult,
  type LocationPermissionState,
} from 'geolocation';

const MAX_RESTAURANT_DISTANCE_METERS = 200;

interface RestaurantBitesParams {
  sourceBiteId: string | undefined;
  restaurantIdOrName: string | undefined;
}

@Injectable({ providedIn: 'root' })
export class HomeDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly networkStatusService = inject(NetworkStatusService);
  private readonly api = inject(BiteTribeApiService);

  sortedHomeBites = toSignal(this.storeService.sortedHomeBites$, {
    initialValue: [] as Bite[],
  });
  sorting = toSignal(this.storeService.homeSorting$, {
    initialValue: 'distance',
  });
  myBites = toSignal(this.storeService.sortedMyBites$, {
    initialValue: [] as Bite[],
  });
  myBitesSorting = toSignal(this.storeService.myBitesSorting$, {
    initialValue: 'distance',
  });
  restaurantBitesSorting = toSignal(this.storeService.restaurantBitesSorting$, {
    initialValue: 'createdAt',
  });
  bitesBySelectedBucketlist = toSignal(
    this.storeService.bitesBySelectedBucketlist$,
    { initialValue: [] as Bite[] },
  );
  allTags = toSignal(this.storeService.allTags$, {
    initialValue: [] as string[],
  });
  homeFilters = toSignal(this.storeService.homeFilters$, {
    initialValue: [] as string[],
  });
  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  selectedBucketlist = toSignal(this.storeService.selectedBucketlist$, {
    requireSync: true,
  });
  triedOutBiteIds = computed(() => {
    return (
      this.selectedBucketlist()?.triedOutBites?.map(
        (triedOutBite) => triedOutBite.biteId,
      ) || []
    );
  });
  selectedBucketlistTitle = toSignal(
    this.storeService.selectedBucketlistTitle$,
    {
      requireSync: true,
    },
  );
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  isBitesLoading = toSignal(this.storeService.isBitesLoading$, {
    initialValue: true,
  });
  homeDistance = toSignal(this.storeService.homeDistance$);
  exchangeRates = toSignal(this.storeService.exchangeRates$, {
    initialValue: {},
  });
  preferedCurrency = toSignal(this.storeService.preferedCurrency$, {
    initialValue: 'EUR',
  });
  maxPriceHome = toSignal(this.storeService.maxPriceHome$, { initialValue: 0 });
  isReloading = toSignal(this.storeService.isReloadingHome$, {
    initialValue: false,
  });
  hasErrorLoadingGpsPosition = toSignal(
    this.storeService.hasErrorLoadingGpsPosition$,
    { initialValue: false },
  );
  biteById = toSignal(this.storeService.bite$);
  private readonly gpsPosition = toSignal(this.storeService.position$);
  private readonly likes = toSignal(this.storeService.likes$, {
    initialValue: [] as Like[],
  });

  networkStatus = this.networkStatusService.status;

  restaurantBitesLoader: ResourceLoader<Bite[], RestaurantBitesParams> = async (
    loaderParams,
  ): Promise<Bite[]> => {
    const bites = await this.loadRestaurantBites(loaderParams);
    this.seedUserLikes(bites);
    return bites;
  };

  private readonly loadRestaurantBites: ResourceLoader<
    Bite[],
    RestaurantBitesParams
  > = async ({ params }): Promise<Bite[]> => {
    const { sourceBiteId, restaurantIdOrName } = params;

    if (!sourceBiteId) {
      return [];
    }

    let sourceBite: Bite | undefined;
    try {
      sourceBite = await this.api.biteById(sourceBiteId);
    } catch {
      return [];
    }

    if (
      sourceBite?.position?.latitude === undefined ||
      sourceBite?.position?.longitude === undefined
    ) {
      return [];
    }

    const sourcePosition = sourceBite.position;
    const loadedSourceBiteId = sourceBite.id;

    let nearbyBites: Bite[];
    try {
      nearbyBites = await this.api.bitesByPosition({
        coords: {
          latitude: sourceBite.position.latitude,
          longitude: sourceBite.position.longitude,
        },
      } as GeolocationPosition);
    } catch {
      return [sourceBite];
    }

    const closeBites = nearbyBites.filter((bite) => {
      if (!bite.position) {
        return false;
      }

      const dist = Number(
        haversineDistance(
          sourcePosition.latitude,
          sourcePosition.longitude,
          bite.position.latitude,
          bite.position.longitude,
          'm',
        ),
      );

      return dist <= MAX_RESTAURANT_DISTANCE_METERS;
    });

    let restaurant: Restaurant | undefined;
    try {
      if (restaurantIdOrName) {
        restaurant = await this.api.loadRestaurant(restaurantIdOrName);
      }
    } catch {
      // fall through to name-based matching below
    }

    let matchedBites: Bite[];

    if (restaurant?.name) {
      const normalizedName = normalize(restaurant.name);
      const restaurantId = restaurant.id;
      matchedBites = closeBites.filter((bite) => {
        const score = getSimilarityScore(normalize(bite.place), normalizedName);
        return (
          (restaurantId !== undefined &&
            bite.restaurantId?.includes(restaurantId)) ||
          score.length > 0
        );
      });
    } else if (restaurantIdOrName || sourceBite?.place) {
      const normalizedName = normalize(
        decodeURIComponent(restaurantIdOrName || sourceBite.place),
      );
      matchedBites = closeBites.filter((bite) => {
        const normalizedBitePlace = normalize(bite.place);
        if (normalizedBitePlace === normalizedName) {
          return true;
        }
        const score = getSimilarityScore(normalizedBitePlace, normalizedName);
        return bite.restaurantId?.includes(normalizedName) || score.length > 0;
      });
    } else {
      matchedBites = closeBites;
    }

    if (!matchedBites.find((b) => b.id === loadedSourceBiteId)) {
      return [sourceBite, ...matchedBites];
    }

    return matchedBites;
  };

  private seedUserLikes(bites: Bite[]): void {
    const userId = this.userId();

    if (!userId || bites.length === 0) {
      return;
    }

    void this.api
      .loadLikesForBites(bites, userId)
      .then((likes) => this.storeService.notifyLikesLoaded(likes))
      .catch(() => undefined);
  }

  restaurantBitesResource = resource({
    params: () => ({
      sourceBiteId: this.storeService.biteIdFromUrl(),
      restaurantIdOrName: this.storeService.restaurantIdFromUrl(),
    }),
    loader: this.restaurantBitesLoader.bind(this),
  });

  restaurantBites = computed((): Bite[] => {
    const likes = this.likes();
    const gpsPosition = this.gpsPosition();
    const bites = (this.restaurantBitesResource.value() ?? []).map((bite) => ({
      ...bite,
      likes: likes.filter((like) => like.biteId === bite.id),
      distance: haversineDistance(
        bite.position?.latitude,
        bite.position?.longitude,
        gpsPosition?.latitude,
        gpsPosition?.longitude,
        'km',
      ),
    }));

    return sortByCriteria(
      bites,
      this.restaurantBitesSorting(),
      this.exchangeRates(),
    );
  });

  restaurantBitesLoading = computed(() =>
    this.restaurantBitesResource.isLoading(),
  );

  logout(): void {
    this.storeService.logout();
  }

  submitLikeClick(likeClick: LikeClick): void {
    this.storeService.submitLikeClick(likeClick);
  }

  deleteBite(bite: Bite): void {
    this.storeService.submitDeleteBite(bite);
  }

  updateBiteRating(params: { bite: Bite; rating: number }): void {
    this.storeService.saveEditedBite({ ...params.bite, rating: params.rating });
  }

  setHomeSorting(sorting: string): void {
    this.storeService.setHomeSorting(sorting);
  }

  setMyBitesSorting(sorting: string): void {
    this.storeService.setMyBitesSorting(sorting);
  }

  setRestaurantBitesSorting(sorting: string): void {
    this.storeService.setRestaurantBitesSorting(sorting);
  }

  setFilters(filters: {
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }): void {
    this.storeService.setHomeFilters(filters);
  }

  clearFilters(): void {
    this.storeService.clearHomeFilters();
  }

  reloadGPSPosition(): void {
    this.storeService.reloadGPSPosition();
  }

  clearGpsError(): void {
    this.storeService.clearGpsError();
  }

  getLocationPermissionState(): Promise<LocationPermissionState> {
    return getLocationPermissionState();
  }

  requestLocationPermission(): Promise<LocationPermissionResult> {
    return requestLocationPermission();
  }

  openLocationSettings(): Promise<boolean> {
    return openLocationSettings();
  }

  markBiteAsTriedOut(params: { biteId: string; checked: boolean }): void {
    const bucketlistId = this.selectedBucketlist()?.id;

    if (!bucketlistId) {
      return;
    }

    this.storeService.setBiteTriedOutStatus({
      bucketlistId,
      ...params,
    });
  }
}
