import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { DocumentData, FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite, Bucketlist, CreateAndUploadImageCallbackParams } from 'model';
import { Platform } from '@ionic/angular';
import { loadBitesByLocation } from './utils/load-bites-by-location';
import { BITE_COLLECTION } from '../utils/constants';
import { loadBitesByUser } from './utils/load-bites-by-user';
import { createBite } from './utils/create-bite';
import { saveEditedBite } from './utils/save-edited-bite';
import { loadBiteById } from './utils/load-bite-by-id';
import { loadBitesByBucketlist } from './utils/load-bites-by-bucketlist';
import { deleteFileInFirebaseStorage } from './utils/delete-file-in-firebasestorage';
import { BehaviorSubject } from 'rxjs';
import { toBite } from '../utils/to-bite';
import { AddCollectionSnapshotListenerCallbackEvent } from '@capacitor-firebase/firestore/dist/esm/definitions';
import { uploadBase64ToFirebaseStorage } from '../utils/upload-base64-to-firebase-storage';
import { updateBiteWithImagePathFromFirestorage } from './utils/update-bite-with-image-path-from-firestorage';

@Injectable({ providedIn: 'root' })
export class BiteApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly platform = inject(Platform);

  private readonly _latestBitesChannel$ = new BehaviorSubject<Bite[]>([]);
  latestBites$ = this._latestBitesChannel$.asObservable();

  isWeb = signal(!this.platform.is('hybrid'));

  /**
   * Loading of the bites using geohashs are done according
   * https://firebase.google.com/docs/firestore/solutions/geoqueries#web_4
   *
   * @param position
   */
  public async loadBitesByLocation(
    position?: GeolocationPosition,
  ): Promise<Bite[]> {
    return loadBitesByLocation(position);
  }

  public async loadBitesByUser(userUid: string): Promise<Bite[]> {
    return loadBitesByUser(userUid);
  }

  public async saveNewBite(biteWithoutImage: Bite): Promise<Bite> {
    const user = this.authService.getUser();

    try {
      const biteId = createBite(biteWithoutImage, user);

      return await loadBiteById(biteId);
    } catch (error) {
      console.error('Error saving new bite:', error);
      this.errorHandler.handleError(error);

      throw error;
    }
  }

  public async uploadImage(
    bite: Bite,
    callbackFn: (p: CreateAndUploadImageCallbackParams) => void,
  ): Promise<void> {
    const { image, ...biteDocWithoutImage } = bite;

    uploadBase64ToFirebaseStorage({
      base64: image,
      docId: bite.id,
      collection: BITE_COLLECTION,
      callbackFn,
    });
  }

  public async updateImagePathInBite(
    bite: Bite,
    imagePath: string,
  ): Promise<Bite> {
    const { image, ...biteWithoutImage } = bite;

    await updateBiteWithImagePathFromFirestorage(
      imagePath,
      biteWithoutImage,
      true,
      bite.id,
    );

    return await loadBiteById(bite.id);
  }

  public async saveEditedBite(bite: Bite): Promise<Bite> {
    try {
      await saveEditedBite(this.isWeb(), bite);

      return await loadBiteById(bite.id);
    } catch (error) {
      console.error('Error saving edited bite:', error);
      this.errorHandler.handleError(error);

      throw error;
    }
  }

  public async deleteBite(bite: Bite): Promise<Bite> {
    if (!bite.id) {
      return Promise.reject(new Error('Bite ID is required for deletion.'));
    }

    const imagePathInFirestore = bite.imagePath;
    try {
      if (imagePathInFirestore) {
        await deleteFileInFirebaseStorage(imagePathInFirestore);
      } else {
        const log = `No imagePath found for bite with id ${bite.id}`;
        console.error(log);
        this.errorHandler.handleError(log);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      this.errorHandler.handleError(error);
      return Promise.reject(error);
    }

    try {
      await FirebaseFirestore.deleteDocument({
        reference: `${BITE_COLLECTION}/${bite.id}`,
      });
    } catch (error) {
      console.error('Error deleting bite:', error);
      this.errorHandler.handleError(error);
      return Promise.reject(error);
    }

    return Promise.resolve(bite);
  }

  async loadBitesByBucketlist(bucketlist: Bucketlist): Promise<Bite[]> {
    try {
      return await loadBitesByBucketlist(bucketlist);
    } catch (e) {
      console.error(`Failed loading bites for bucketlist ${bucketlist.id}:`, e);
      this.errorHandler.handleError(e);
      return [];
    }
  }

  async startlatestBitesListener(number: number): Promise<void> {
    await FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: BITE_COLLECTION,
        queryConstraints: [
          {
            type: 'orderBy',
            fieldPath: 'createdAtTimestamp',
            directionStr: 'desc',
          },
          { type: 'limit', limit: number },
        ],
      },
      (biteDocs) => {
        this.handleLatestBites(biteDocs);
      },
    );
  }

  handleLatestBites(
    biteDocs: AddCollectionSnapshotListenerCallbackEvent<DocumentData> | null,
  ): void {
    const bites = biteDocs?.snapshots?.map((snapshot) => toBite(snapshot));

    this._latestBitesChannel$.next(bites || []);
  }
}
