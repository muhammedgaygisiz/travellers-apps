import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, Like } from 'model';

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
    { initialValue: [] as Bite[] }
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
    }
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

  logout() {
    this.storeService.logout();
  }

  submitLikeClick(likeType: { likeType: string; biteId: string }) {
    const bites = this.sortedHomeBites();
    const userId = this.userId();

    const bite = bites?.find((bite: Bite) => bite.id === likeType.biteId);
    const likeFromUser = bite?.likes?.find(
      (like: Like) =>
        like.userId === userId && like.likeType === likeType.likeType
    );

    if (likeFromUser) {
      this.storeService.removeLike(likeType);
      return;
    }

    this.storeService.submitLikeClick(likeType);
  }

  deleteBite(bite: Bite) {
    this.storeService.submitDeleteBite(bite);
  }

  setHomeSorting(sorting: string) {
    this.storeService.setHomeSorting(sorting);
  }

  setFilters(filters: {
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }) {
    this.storeService.setHomeFilters(filters);
  }

  clearFilters() {
    this.storeService.clearHomeFilters();
  }
}
