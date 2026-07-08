import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Bite, LikeClick } from 'model';

@Injectable({
  providedIn: 'root',
})
export class MapDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bites = toSignal(this.storeService.bites$, { initialValue: [] as Bite[] });
  bitesBySelectedBucketlist = toSignal(
    this.storeService.bitesBySelectedBucketlist$,
    {
      initialValue: [] as Bite[],
    },
  );
  myBites = toSignal(this.storeService.sortedMyBites$, {
    initialValue: [] as Bite[],
  });
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

  submitLikeClick(likeClick: LikeClick): void {
    this.storeService.submitLikeClick(likeClick);
  }
}
