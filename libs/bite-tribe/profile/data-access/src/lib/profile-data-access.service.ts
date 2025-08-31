import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { Bite, Like } from 'model';

@Injectable({ providedIn: 'root' })
export class ProfileDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  bitesByUser = toSignal(this.storeService.bitesByUser$, {
    initialValue: [] as Bite[],
  });

  private bites = toSignal(this.storeService.bites$, {
    initialValue: [] as Bite[],
  });
  biteCreator = toSignal(this.storeService.biteCreator$);
  userId = toSignal(this.storeService.userId$, { initialValue: '' });

  logout(): void {
    this.storeService.logout();
  }

  submitLikeClick(likeType: { likeType: string; biteId: string }): void {
    const bites = this.bites();
    const userId = this.userId();

    const bite = bites?.find((bite) => bite.id === likeType.biteId);
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
}
