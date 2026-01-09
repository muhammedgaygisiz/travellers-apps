import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite, Bucketlist } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { storagePathFromDownloadUrl } from 'utils';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { toBite } from '../utils/to-bite';
import { Platform } from '@ionic/angular';
import { loadBitesByLocation } from './utils/load-bites-by-location';
import { BITE_COLLECTION } from './utils/constants';
import { loadBitesByUser } from './utils/load-bites-by-user';
import { createBite } from './utils/create-bite';
import { uploadImageAndUpdateBite } from './utils/upload-image-and-update-bite';
import { saveEditedBite } from './utils/save-edited-bite';
import { loadBiteById } from './utils/load-bite-by-id';
import { loadBitesByBuckelist } from './utils/load-bites-by-buckelist';

@Injectable({ providedIn: 'root' })
export class BiteApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly platform = inject(Platform);

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

  public async loadBitesByUser(user: { uid: string }): Promise<Bite[]> {
    return loadBitesByUser(user);
  }

  public async saveNewBite(bite: Bite): Promise<Bite> {
    const user = this.getUser();
    const { image, ...biteDocWithoutImage } = bite;

    try {
      const biteId = await createBite(biteDocWithoutImage, user);

      await uploadImageAndUpdateBite(this.isWeb(), image, biteId);

      return await loadBiteById(biteId);
    } catch (error) {
      console.error('Error saving new bite:', error);
      this.errorHandler.handleError(error);

      throw error;
    }
  }

  private getUser(): User | null | undefined {
    const authState = this.authService.authState();
    return authState?.user;
  }

  public async saveEditedBite(bite: Bite): Promise<void> {
    try {
      await saveEditedBite(this.isWeb(), bite);
    } catch (error) {
      console.error('Error saving edited bite:', error);
      this.errorHandler.handleError(error);
    }
  }

  async deleteBite(bite: Bite): Promise<Bite> {
    return new Promise<Bite>((resolve, reject) => {
      if (!bite.id) {
        return reject(new Error('Bite ID is required for deletion.'));
      }

      try {
        const imagePathInFirestore = bite.imagePath;

        if (imagePathInFirestore) {
          const imagePath = storagePathFromDownloadUrl(imagePathInFirestore);
          if (imagePath) {
            FirebaseStorage.deleteFile({
              path: imagePath,
            });
          }
        } else {
          const log = `No imagePath found for bite with id ${bite.id}`;
          console.error(log);
          this.errorHandler.handleError(log);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        this.errorHandler.handleError(error);
        return reject(error);
      }

      try {
        FirebaseFirestore.deleteDocument({
          reference: `${BITE_COLLECTION}/${bite.id}`,
        });
      } catch (error) {
        console.error('Error deleting bite:', error);
        this.errorHandler.handleError(error);
        return reject(error);
      }

      return resolve(bite);
    });
  }

  async loadBitesByBucketlist(bucketlist: Bucketlist): Promise<Bite[]> {
    try {
      return await loadBitesByBuckelist(bucketlist);
    } catch (e) {
      console.error(`Failed loading bites for bucketlist ${bucketlist.id}:`, e);
      this.errorHandler.handleError(e);
      return [];
    }
  }
}
