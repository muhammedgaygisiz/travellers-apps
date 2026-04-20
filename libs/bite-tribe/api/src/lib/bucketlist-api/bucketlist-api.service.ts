import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  Bucketlist,
  CreateAndSaveToBucketListParams,
  CreateBucketListFromBiteTrailParams,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';
import { loadBucketlistsByUserId } from './utils/load-bucketlists-by-user-id';
import {
  BITE_TRAIL_COLLECTION,
  BUCKETLIST_COLLECTION,
} from '../utils/constants';

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

  async createBucketListFromBiteTrail(
    params: CreateBucketListFromBiteTrailParams,
  ): Promise<Bucketlist> {
    const user = this.authService.getUser();

    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    const nowTimestamp = Date.now();
    const nowIsoString = new Date(nowTimestamp).toISOString();

    const docResult = await FirebaseFirestore.addDocument({
      reference: BUCKETLIST_COLLECTION,
      data: {
        userId: user.uid,
        name: params.bucketListName,
        biteIds: params.biteIds,
        biteTrailId: params.biteTrailId,
        createdAt: nowIsoString,
        createdAtTimestamp: nowTimestamp,
      },
    });

    try {
      await FirebaseFirestore.addDocument({
        reference: `${BITE_TRAIL_COLLECTION}/${params.biteTrailId}/sells`,
        data: {
          userId: user.uid,
          soldAt: nowIsoString,
          soldAtTimestamp: nowTimestamp,
        },
      });
    } catch (error) {
      try {
        await FirebaseFirestore.deleteDocument({
          reference: docResult.reference.path,
        });
      } catch (rollbackError) {
        console.error(
          'Error rolling back bucket list after sell write failure:',
          rollbackError,
        );
        this.errorHandler.handleError(rollbackError);
      }

      throw error;
    }

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

      const remainingTriedOutBites = bucketListDoc?.snapshot?.data?.[
        'triedOutBites'
      ]?.filter((currBite: { biteId: string }) => currBite.biteId !== biteId);

      await FirebaseFirestore.updateDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
        data: {
          biteIds: newBiteIdListInBucketList,
          triedOutBites: remainingTriedOutBites,
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

  async deleteBucketlist(bucketlistId: string): Promise<void> {
    try {
      await FirebaseFirestore.deleteDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
      });
    } catch (error) {
      console.error('Error deleting bucket list:', error);
      this.errorHandler.handleError(error);
    }
  }

  async updateBucketlistName(
    bucketlistId: string,
    name: string,
  ): Promise<void> {
    try {
      await FirebaseFirestore.updateDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
        data: {
          name,
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Error updating bucket list name:', error);
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Updates tried-out status for a bite within a bucketlist.
   * Adds/updates an entry in `triedOutBites` when checked is true,
   * and removes it when checked is false.
   */
  async updateBucketlistTriedOutStatus(params: {
    bucketlistId: string;
    biteId: string;
    checked: boolean;
  }): Promise<void> {
    const { bucketlistId, biteId, checked } = params;
    try {
      const bucketListDoc = await FirebaseFirestore.getDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
      });

      const existingTriedOutBites =
        (bucketListDoc.snapshot.data?.['triedOutBites'] as {
          biteId: string;
          date: string;
          time: string;
        }[]) || [];

      const now = new Date();
      const triedOutBites = checked
        ? [
            ...existingTriedOutBites.filter(
              (triedOutBite) => triedOutBite.biteId !== biteId,
            ),
            {
              biteId,
              date: now.toISOString().split('T')[0],
              time: now.toTimeString().split(' ')[0],
            },
          ]
        : existingTriedOutBites.filter(
            (triedOutBite) => triedOutBite.biteId !== biteId,
          );

      await FirebaseFirestore.updateDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
        data: {
          triedOutBites,
          updatedAt: now.toISOString(),
          updatedAtTimestamp: now.getTime(),
        },
      });
    } catch (error) {
      this.errorHandler.handleError(error);
    }
  }
}
