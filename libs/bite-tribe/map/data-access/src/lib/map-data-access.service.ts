import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite } from 'model';

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

  logout(): void {
    this.storeService.logout();
  }

  submitLikeClick(likeType: { likeType: string; biteId: string }): void {
    const bites = this.bites();
    const userId = this.userId();
    const bite = bites?.find((bite: Bite) => bite.id === likeType.biteId);
    this.storeService.submitLikeOrDislikeClick(bite, userId, likeType);
  }
}
