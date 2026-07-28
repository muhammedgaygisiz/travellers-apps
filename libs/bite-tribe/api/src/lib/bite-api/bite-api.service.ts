import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { DocumentData, FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  Bite,
  Bucketlist,
  CreateAndUploadImageCallbackParams,
  Geopoint,
  GooglePlace,
  PlaceDetails,
  WeekRange,
  WeeklyBites,
} from 'model';
import { Platform } from '@ionic/angular';
import { loadBitesByLocation } from './utils/load-bites-by-location';
import { searchPlaces } from './utils/search-places';
import { searchNearbyPlaces } from './utils/search-nearby-places';
import { getPlaceDetails } from './utils/get-place-details';
import { getCurrencyByPosition } from './utils/get-currency-by-position';
import { BITE_COLLECTION } from '../utils/constants';
import { loadBitesByUser } from './utils/load-bites-by-user';
import { loadWeeklyBites } from './utils/load-weekly-bites';
import { createBite } from './utils/create-bite';
import { saveEditedBite } from './utils/save-edited-bite';
import { loadBiteById } from './utils/load-bite-by-id';
import { loadBitesByBucketlist } from './utils/load-bites-by-bucketlist';
import { deleteFileInFirebaseStorage } from './utils/delete-file-in-firebasestorage';
import { BehaviorSubject } from 'rxjs';
import { toBite } from '../utils/to-bite';
import { AddCollectionSnapshotListenerCallbackEvent } from '@capacitor-firebase/firestore/dist/esm/definitions';
import { uploadBase64ToFirebaseStorage } from '../utils/upload-base64-to-firebase-storage';
import {
  findLocalUploadedImage,
  type LocalImageFile,
} from '../utils/local-image-file';
import { readLocalImageAsDataUrl } from '../utils/read-local-image-as-data-url';
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

  public async loadWeeklyBites(
    range?: WeekRange,
  ): Promise<WeeklyBites | undefined> {
    return loadWeeklyBites(range);
  }

  public async searchPlaces(
    searchText: string,
    position?: Geopoint,
  ): Promise<GooglePlace[]> {
    return searchPlaces(searchText, position);
  }

  public async searchNearbyPlaces(position: Geopoint): Promise<GooglePlace[]> {
    return searchNearbyPlaces(position);
  }

  public async getPlaceDetails(
    placeId: string,
  ): Promise<PlaceDetails | undefined> {
    return getPlaceDetails(placeId);
  }

  public async getCurrencyByPosition(
    position?: Geopoint,
  ): Promise<string | undefined> {
    return getCurrencyByPosition(position);
  }

  public async loadBiteById(biteId: string): Promise<Bite> {
    return loadBiteById(biteId);
  }

  public async saveNewBite(
    biteWithoutImage: Omit<Bite, 'image'>,
  ): Promise<Bite> {
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
    void biteDocWithoutImage;

    uploadBase64ToFirebaseStorage({
      base64: image,
      docId: bite.id,
      collection: BITE_COLLECTION,
      callbackFn,
    });
  }

  /**
   * Records how the Bite's image upload ended.
   *
   * `setBiteImagePathOnUpload` only ever runs when an object finalizes, so a
   * failed upload leaves the document on `'pending'` forever and every viewer
   * keeps seeing the "uploading" overlay. The client owns the failure, so it
   * writes the terminal state itself. See GitHub issue #1168.
   */
  public async setImageStatus(
    biteId: string,
    imageStatus: Bite['imageStatus'],
  ): Promise<void> {
    try {
      await FirebaseFirestore.updateDocument({
        reference: `${BITE_COLLECTION}/${biteId}`,
        data: { imageStatus },
      });
    } catch (error) {
      // Best effort: the upload already failed, and failing to record that must
      // not surface a second error to the user.
      console.error(`Error setting image status for bite ${biteId}:`, error);
      this.errorHandler.handleError(error);
    }
  }

  /**
   * The local copy this device kept of a Bite's photo, if it is still there.
   *
   * Only the device that posted the Bite has one, and only until the user
   * clears their files, so an empty result is normal rather than an error.
   */
  public async findLocalImage(
    biteId: string,
  ): Promise<LocalImageFile | undefined> {
    return findLocalUploadedImage(BITE_COLLECTION, biteId);
  }

  /**
   * Re-uploads a Bite's photo from a file on this device.
   *
   * Same transfer as {@link uploadImage}, but starting from a stored file
   * instead of the base64 the create form held in memory. See GitHub issue
   * #1168.
   */
  public async uploadImageFromLocalFile(
    biteId: string,
    fileUri: string,
    callbackFn: (p: CreateAndUploadImageCallbackParams) => void,
  ): Promise<void> {
    const base64 = await readLocalImageAsDataUrl(fileUri);

    uploadBase64ToFirebaseStorage({
      base64,
      docId: biteId,
      collection: BITE_COLLECTION,
      callbackFn,
    });
  }

  public async updateImagePathInBite(
    bite: Bite,
    imagePath: string,
  ): Promise<Bite> {
    const { image, ...biteWithoutImage } = bite;
    void image;

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
