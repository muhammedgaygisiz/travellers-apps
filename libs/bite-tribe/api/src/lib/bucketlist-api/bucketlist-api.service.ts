import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  Bucketlist,
  CreateAndSaveToBucketListParams,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';
import { loadBucketlistsByUserId } from './utils/load-bucketlists-by-user-id';
import { BUCKETLIST_COLLECTION } from '../utils/constants';

@Injectable({ providedIn: 'root' })
export class BucketlistApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  loadBucketlistsByUserId(userId: string): Promise<Bucketlist[]> {
    return loadBucketlistsByUserId(userId);
  }

  async saveBiteIdToBucketList({
    bucketListId,
    biteId,
  }: SaveToBucketListParams): Promise<Bucketlist> {
    const bucketListDoc = await FirebaseFirestore.getDocument({
      reference: `${BUCKETLIST_COLLECTION}/${bucketListId}`,
    });

    const data = bucketListDoc.snapshot.data as Bucketlist;

    const uniqueBiteIds = [...new Set([...(data['biteIds'] || []), biteId])];

    await FirebaseFirestore.updateDocument({
      reference: bucketListDoc.snapshot.path,
      data: {
        biteIds: uniqueBiteIds,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    const result = await FirebaseFirestore.getDocument({
      reference: bucketListDoc.snapshot.path,
    });

    return result.snapshot.data as Bucketlist;
  }

  async createBucketListAndSaveBiteIdToBucketList(
    params: CreateAndSaveToBucketListParams,
  ): Promise<Bucketlist> {
    const user = this.authService.getUser();

    const docResult = await FirebaseFirestore.addDocument({
      reference: BUCKETLIST_COLLECTION,
      data: {
        userId: user?.uid || '',
        name: params.bucketListName,
        biteIds: params.biteId ? [params.biteId] : [],
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    const result = await FirebaseFirestore.getDocument({
      reference: docResult.reference.path,
    });

    return result.snapshot.data as Bucketlist;
  }

  async removeBiteFromBucketlist({
    bucketlistId,
    biteId,
  }: RemoveBiteFromBucketlistParams): Promise<void> {
    try {
      const bucketListDoc = await FirebaseFirestore.getDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
      });

      const newBiteIdListInBucketList = bucketListDoc?.snapshot?.data?.[
        'biteIds'
      ]?.filter((currBiteId: string) => currBiteId !== biteId);

      await FirebaseFirestore.updateDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
        data: {
          biteIds: newBiteIdListInBucketList,
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error removing bite from bucket list:', error);
      this.errorHandler.handleError(error);
    }
  }

  async createBucketList(bucketlistName: string): Promise<void> {
    try {
      const user = this.authService.getUser();

      await FirebaseFirestore.addDocument({
        reference: BUCKETLIST_COLLECTION,
        data: {
          userId: user?.uid || '',
          name: bucketlistName,
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error creating bucket list:', error);
      this.errorHandler.handleError(error);
    }
  }
}
