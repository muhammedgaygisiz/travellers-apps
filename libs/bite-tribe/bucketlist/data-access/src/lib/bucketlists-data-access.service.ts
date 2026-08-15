import { ErrorHandler, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Bite,
  BiteTrailRating,
  Bucketlist,
  RemoveBiteFromBucketlistParams,
} from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { isBiteTrailRating } from './utils/is-bite-trail-rating';

const BITE_TRAIL_COLLECTION = 'biteTrails';
const RATINGS_COLLECTION = 'ratings';

@Injectable({ providedIn: 'root' })
export class BucketlistsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly errorHandler = inject(ErrorHandler);

  bucketlists = toSignal(this.storeService.sortedBucketlists$, {
    initialValue: [] as Bucketlist[],
  });

  userId = toSignal(this.storeService.userId$, {
    initialValue: '',
  });

  selectedBucketlist = toSignal(this.storeService.selectedBucketlist$, {
    initialValue: undefined as Bucketlist | undefined,
  });

  bitesBySelectedBucketlist = toSignal(
    this.storeService.bitesBySelectedBucketlist$,
    { initialValue: [] as Bite[] },
  );

  createAndSaveToBucketList(bucketListName: string): void {
    this.storeService.createBucketList(bucketListName);
  }

  deleteBucketlist(bucketlistId: string): void {
    this.storeService.deleteBucketlist(bucketlistId);
  }

  updateBucketlistName(bucketlistId: string, name: string): void {
    this.storeService.updateBucketlistName(bucketlistId, name);
  }

  removeBiteFromBucketlist(params: RemoveBiteFromBucketlistParams): void {
    this.storeService.removeBiteFromBucketlist(params);
  }

  async getOwnBiteTrailRating(
    biteTrailId: string,
  ): Promise<BiteTrailRating | undefined> {
    try {
      const userId = this.userId();

      if (!userId || !biteTrailId) {
        return undefined;
      }

      const document = await FirebaseFirestore.getDocument({
        reference: `${BITE_TRAIL_COLLECTION}/${biteTrailId}/${RATINGS_COLLECTION}/${userId}`,
      });

      if (!isBiteTrailRating(document.snapshot.data)) {
        return undefined;
      }

      return document.snapshot.data;
    } catch (error) {
      this.errorHandler.handleError(error);
      return undefined;
    }
  }

  async createOwnBiteTrailRating(params: {
    biteTrailId: string;
    rating: number;
    review: string;
  }): Promise<boolean> {
    try {
      const userId = this.userId();
      const { biteTrailId, rating, review } = params;

      if (!userId || !biteTrailId) {
        return false;
      }

      const reference = `${BITE_TRAIL_COLLECTION}/${biteTrailId}/${RATINGS_COLLECTION}/${userId}`;

      const existingDocument = await FirebaseFirestore.getDocument({
        reference,
      });

      if (existingDocument.snapshot.data) {
        return false;
      }

      await FirebaseFirestore.setDocument({
        reference,
        data: {
          biteTrailId,
          authorId: userId,
          rating,
          review,
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now(),
        },
      });

      return true;
    } catch (error) {
      this.errorHandler.handleError(error);
      return false;
    }
  }
}
