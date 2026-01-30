import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Bite, Like } from 'model';

@Injectable({
  providedIn: 'root',
})
export class MapDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bites = toSignal(this.storeService.bites$, { initialValue: [] as Bite[] });
  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  selectedBucketlist = toSignal(this.storeService.selectedBucketlist$, {
    requireSync: true,
  });
  gpsPosition = toSignal(this.storeService.position$);
  userHasSubscriptionTierOne = toSignal(
    this.storeService.userHasSubscriptionTierOne$,
    { initialValue: false },
  );

  logout(): void {
    this.storeService.logout();
  }

  submitLikeClick(likeType: Like): void {
    const bites = this.bites();
    const userId = this.userId();
    const bite = bites?.find((bite: Bite) => bite.id === likeType.biteId);

    if (!userId) {
      return;
    }

    this.storeService.submitLikeOrDislikeClick(bite, userId, likeType);
  }
}
