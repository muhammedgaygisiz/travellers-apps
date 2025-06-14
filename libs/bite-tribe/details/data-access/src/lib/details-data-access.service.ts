import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { splitTags } from 'utils';
import { RemoveBiteFromBucketlistParams, SaveToBucketListParams } from 'model';

@Injectable({
  providedIn: 'root',
})
export class DetailsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bite = toSignal(this.storeService.bite$);
  reviews = toSignal(this.storeService.reviews$, { initialValue: [] as any });
  bucketlists = toSignal(this.storeService.bucketlists$, {
    initialValue: [] as any,
  });
  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  biteCreator = toSignal(this.storeService.biteCreator$);

  saveNewTags(newTags: string) {
    const currentBite = this.bite();

    if (currentBite) {
      const newTagsArray = splitTags(newTags);

      this.storeService.saveTags(newTagsArray, currentBite.id);

      return;
    }
  }

  saveNewReview(newReview: { review: string; biteId: string }) {
    this.storeService.saveReview(newReview);
  }

  saveToBucketList(saveToBucketListEvent: SaveToBucketListParams) {
    this.storeService.saveToBucketList(saveToBucketListEvent);
  }

  createAndSaveToBucketList(param: {
    bucketListName: string;
    biteId: string | undefined;
  }) {
    this.storeService.createAndSaveToBucketList(param);
  }

  removeBiteFromBucketlist($event: RemoveBiteFromBucketlistParams) {
    this.storeService.removeBiteFromBucketlist($event);
  }

  submitLikeClick(likeType: { likeType: string; biteId: string }) {
    const bite = this.bite();
    const userId = this.userId();

    const likeFromUser = bite?.likes?.find(
      (like) => like.userId === userId && like.likeType === likeType.likeType
    );

    if (likeFromUser) {
      this.storeService.removeLike(likeType);
      return;
    }

    this.storeService.submitLikeClick(likeType);
  }

  logout() {
    this.storeService.logout();
  }
}
