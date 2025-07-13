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
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  CreateAndSaveToBucketListParams,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';

const BUCKETLIST_COLLECTION = 'bucketlists';

@Injectable({ providedIn: 'root' })
export class BucketlistApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly bucketlistsChannel$ = new BehaviorSubject<any[]>([]);

  private readonly stopped$ = new Subject<void>();
  bucketlistCallbackId = '';

  public allBucketlists$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap((isLoggedIn) => {
      if (isLoggedIn) {
        this.startBucketlistsListener();
      } else {
        this.stopBucketlistListener(this.bucketlistCallbackId);
      }

      return this.bucketlistsChannel$.pipe(skip(1), takeUntil(this.stopped$));
    })
  );

  private async getUser() {
    const authState = await this.authService.authState();
    return authState?.user;
  }

  private async startBucketlistsListener() {
    const user = await this.getUser();

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
        async (bucketlistDocs) => {
          const bucketlists =
            bucketlistDocs?.snapshots.map((doc) => ({
              ...doc.data,
              id: doc.id,
            })) || [];

          this.bucketlistsChannel$.next(bucketlists);
        }
      );
  }

  private async stopBucketlistListener(callbackId: string) {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  async saveBiteIdToBucketList({
    bucketListId,
    biteId,
  }: SaveToBucketListParams) {
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

        FirebaseFirestore.updateDocument({
          reference: bucketListDoc.snapshot.path,
          data: {
            biteIds: uniqueBiteIds,
          },
        });
      }
    } catch (error) {
      console.error('Error saving bite ID to bucket list:', error);
      this.errorHandler.handleError(error);
    }
  }

  async createBucketListAndSaveBiteIdToBucketList(
    params: CreateAndSaveToBucketListParams
  ) {
    try {
      const user = await this.getUser();

      FirebaseFirestore.addDocument({
        reference: BUCKETLIST_COLLECTION,
        data: {
          userId: user?.uid || '',
          name: params.bucketListName,
          biteIds: params.biteId ? [params.biteId] : [],
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
  }: RemoveBiteFromBucketlistParams) {
    try {
      const bucketListDoc = await FirebaseFirestore.getDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
      });

      const newBiteIdListInBucketList = bucketListDoc?.snapshot?.data?.[
        'biteIds'
      ]?.filter((currBiteId: string) => currBiteId !== biteId);

      FirebaseFirestore.updateDocument({
        reference: `${BUCKETLIST_COLLECTION}/${bucketlistId}`,
        data: {
          biteIds: newBiteIdListInBucketList,
        },
      });
    } catch (error) {
      console.error('Error removing bite from bucket list:', error);
      this.errorHandler.handleError(error);
    }
  }

  async createBucketList(bucketlistName: string) {
    try {
      const user = await this.getUser();

      FirebaseFirestore.addDocument({
        reference: BUCKETLIST_COLLECTION,
        data: {
          userId: user?.uid || '',
          name: bucketlistName,
        },
      });
    } catch (error) {
      console.error('Error creating bucket list:', error);
      this.errorHandler.handleError(error);
    }
  }
}
