import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite } from 'model';

@Injectable({ providedIn: 'root' })
export class HomeDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  sortedHomeBites = toSignal(this.storeService.sortedHomeBites$, {
    initialValue: [] as Bite[],
  });
  sorting = toSignal(this.storeService.homeSorting$, {
    initialValue: 'distance',
  });
  myBites = toSignal(this.storeService.mybites$, {
    initialValue: [] as Bite[],
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

  logout(): void {
    this.storeService.logout();
  }

  submitLikeClick(likeType: { likeType: string; biteId: string }): void {
    const bites = this.sortedHomeBites();
    const userId = this.userId();
    const bite = bites?.find((bite: Bite) => bite.id === likeType.biteId);
    this.storeService.submitLikeOrDislikeClick(bite, userId, likeType);
  }

  deleteBite(bite: Bite): void {
    this.storeService.submitDeleteBite(bite);
  }

  setHomeSorting(sorting: string): void {
    this.storeService.setHomeSorting(sorting);
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
}
