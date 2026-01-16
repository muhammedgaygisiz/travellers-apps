import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { DocumentData, FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  CreateAndSaveToBucketListParams,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { AddCollectionSnapshotListenerCallbackEvent } from '@capacitor-firebase/firestore/dist/esm/definitions';

const BUCKETLIST_COLLECTION = 'bucketlists';

@Injectable({ providedIn: 'root' })
export class BucketlistApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly _bucketlistsChannel$ = new BehaviorSubject<any[]>([]);
  bucketlists$ = this._bucketlistsChannel$.asObservable().pipe(skip(1));

  private readonly stopped$ = new Subject<void>();
  bucketlistCallbackId = '';

  public async startListener(): Promise<void> {
    const user = this.getUser();

    this.bucketlistCallbackId =
      await FirebaseFirestore.addCollectionSnapshotListener(
        {
          reference: BUCKETLIST_COLLECTION,
          compositeFilter: {
            type: 'and',
            queryConstraints: [
              {
                type: 'where',
                fieldPath: 'userId',
                opStr: '==',
                value: user?.uid,
              },
            ],
          },
        },
        async (bucketlistDocs): Promise<void> =>
          this.handleResponse(bucketlistDocs),
      );
  }

  handleResponse(
    bucketlistDocs: AddCollectionSnapshotListenerCallbackEvent<DocumentData> | null,
  ): void {
    const bucketlists =
      bucketlistDocs?.snapshots.map((doc) => ({
        ...doc.data,
        id: doc.id,
      })) || [];

    this._bucketlistsChannel$.next(bucketlists);
  }

  private getUser(): User | null | undefined {
    const authState = this.authService.authState();
    return authState?.user;
  }

  async stopBucketlistListener(callbackId: string): Promise<void> {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  async saveBiteIdToBucketList({
    bucketListId,
    biteId,
  }: SaveToBucketListParams): Promise<void> {
    try {
      const bucketListDoc = await FirebaseFirestore.getDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketListId}`,
      });

      if (bucketListDoc?.snapshot?.data) {
        const uniqueBiteIds = [
          ...new Set([
            ...(bucketListDoc.snapshot.data['biteIds'] || []),
            biteId,
          ]),
        ];

        await FirebaseFirestore.updateDocument({
          reference: bucketListDoc.snapshot.path,
          data: {
            biteIds: uniqueBiteIds,
            updatedAt: new Date().toISOString(),
            updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
          },
        });
      }
    } catch (error) {
      console.error('Error saving bite ID to bucket list:', error);
      this.errorHandler.handleError(error);
    }
  }

  async createBucketListAndSaveBiteIdToBucketList(
    params: CreateAndSaveToBucketListParams,
  ): Promise<void> {
    try {
      const user = this.getUser();

      await FirebaseFirestore.addDocument({
        reference: BUCKETLIST_COLLECTION,
        data: {
          userId: user?.uid || '',
          name: params.bucketListName,
          biteIds: params.biteId ? [params.biteId] : [],
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error creating bucket list and saving bite ID:', error);
      this.errorHandler.handleError(error);
    }
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
      const user = this.getUser();

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
