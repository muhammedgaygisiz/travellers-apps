import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, Bucketlist, RemoveBiteFromBucketlistParams } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

interface BiteTrailRating {
  rating: number;
  review: string;
}

const BITE_TRAIL_COLLECTION = 'biteTrails';
const RATINGS_COLLECTION = 'ratings';

@Injectable({ providedIn: 'root' })
export class BucketlistsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bucketlists = toSignal(this.storeService.sortedBucketlists$, {
    initialValue: [] as Bucketlist[],
  });
  sorting = toSignal(this.storeService.bucketlistSorting$, {
    initialValue: 'name',
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

  setBucketlistSorting(sorting: string): void {
    this.storeService.setBucketlistSorting(sorting);
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
    const userId = this.userId();

    if (!userId || !biteTrailId) {
      return undefined;
    }

    const document = await FirebaseFirestore.getDocument({
      reference: `${BITE_TRAIL_COLLECTION}/${biteTrailId}/${RATINGS_COLLECTION}/${userId}`,
    });

    if (!document.snapshot.data) {
      return undefined;
    }

    return document.snapshot.data as BiteTrailRating;
  }

  async createOwnBiteTrailRating(params: {
    biteTrailId: string;
    rating: number;
    review: string;
  }): Promise<boolean> {
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
  }
}
