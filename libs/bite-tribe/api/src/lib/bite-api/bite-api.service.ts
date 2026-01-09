import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite, Bucketlist } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import {
  dataUrlToBlob,
  getDownloadUrlFromFirebaseStorage,
  guessExtFromContentType,
  storagePathFromDownloadUrl,
} from 'utils';
import { v4 as uuidv4 } from 'uuid';
import {
  FirebaseStorage,
  UploadFileOptions,
} from '@capacitor-firebase/storage';
import { toBite } from '../utils/to-bite';
import { Platform } from '@ionic/angular';
import { writeBlobToFileSystem } from './utils/write-blob-to-file-system';
import { loadBitesByLocation } from './utils/load-bites-by-location';
import { BITE_COLLECTION } from './utils/constants';
import { loadBitesByUser } from './utils/load-bites-by-user';
import { createBite } from './utils/create-bite';

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

      await this.uploadImageAndUpdateBite(image, biteId);

      return await this.loadBiteById(biteId);
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

  async saveEditedBite(bite: Bite): Promise<void> {
    try {
      if (bite.imagePath && bite.image) {
        const { image, ...biteWithoutImage } = bite;

        await this.replaceImageInFirestoreStorage(
          image,
          bite.imagePath,
          bite.id,
          biteWithoutImage,
        );

        return;
      }

      if (bite.imagePath && !bite.image) {
        const { image, ...biteWithoutImage } = bite;

        await FirebaseFirestore.updateDocument({
          reference: `${BITE_COLLECTION}/${bite.id}`,
          data: {
            ...biteWithoutImage,
            updatedAt: new Date().toISOString(),
            updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
          },
        });

        return;
      }

      if (!bite.imagePath && bite.image) {
        const doc = await FirebaseFirestore.getDocument({
          reference: `${BITE_COLLECTION}/${bite.id}`,
        });
        const originalBite = toBite(doc.snapshot);
        const originalImagePath = originalBite.imagePath;

        if (originalImagePath) {
          const { image, ...biteWithoutImage } = bite;

          await this.replaceImageInFirestoreStorage(
            image,
            originalImagePath,
            bite.id,
            { ...biteWithoutImage },
          );

          return;
        }

        // Bite created in old style only with base64 image
        // so we do not have a imagePath yet
        const { image, imagePath, ...biteWithoutImage } = bite;
        await this.uploadImageAndUpdateBite(
          image,
          bite.id,
          biteWithoutImage,
          true,
        );

        return;
      }

      await FirebaseFirestore.updateDocument({
        reference: `${BITE_COLLECTION}/${bite.id}`,
        data: {
          ...bite,
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error saving edited bite:', error);
      this.errorHandler.handleError(error);
    }
  }

  async saveTagsToExistingBite(payload: {
    newTags: string[];
    id: string;
  }): Promise<void> {
    try {
      // First get the current document
      const doc = await FirebaseFirestore.getDocument({
        reference: `${BITE_COLLECTION}/${payload.id}`,
      });

      const data = doc.snapshot.data;
      // Combine existing and new tags, removing duplicates
      const existingTags = data && (data['tags'] || []);
      const uniqueTags = [...new Set([...existingTags, ...payload.newTags])];

      // Update the document with merged tags
      await FirebaseFirestore.updateDocument({
        reference: `${BITE_COLLECTION}/${payload.id}`,
        data: {
          tags: uniqueTags,
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error updating tags:', error);
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

  private async uploadImageAndUpdateBite(
    imageBase64: string,
    biteId: string,
    biteWithoutImage?: Omit<Bite, 'image'>,
    clearBase64Image = false,
  ): Promise<void> {
    const { blob, contentType } = await dataUrlToBlob(imageBase64);
    const ext = guessExtFromContentType(contentType);

    const imageId = uuidv4();
    const imagePath = `images/${BITE_COLLECTION}/${biteId}/${imageId}.${ext}`;

    const fileUploadOptions: UploadFileOptions = {
      path: imagePath,
      blob,
      metadata: {
        contentType: contentType,
        cacheControl: 'public,max-age=31536000,immutable',
      },
    };

    if (!this.isWeb()) {
      const writeFileResult = await writeBlobToFileSystem(
        blob,
        `${imageId}.${ext}`,
      );
      fileUploadOptions.uri = writeFileResult.uri;
    }

    return new Promise<void>((resolve, reject) => {
      FirebaseStorage.uploadFile(fileUploadOptions, async (event, error) => {
        if (error) {
          console.error('Error uploading image:', error);
          this.errorHandler.handleError(error);

          if (fileUploadOptions.uri) {
            try {
              await FirebaseStorage.deleteFile({ path: fileUploadOptions.uri });
            } catch (error) {
              console.error('Error deleting temp file:', error);
              this.errorHandler.handleError(error);
            }
          }

          return reject(error);
        }

        if (event?.completed) {
          try {
            const downloadUrl =
              await getDownloadUrlFromFirebaseStorage(imagePath);

            const data = {
              ...(biteWithoutImage || {}),
              imagePath: downloadUrl,
            } as any;

            if (clearBase64Image) {
              data.image = '';
            }

            await FirebaseFirestore.updateDocument({
              reference: `${BITE_COLLECTION}/${biteId}`,
              data,
            });

            if (fileUploadOptions.uri) {
              try {
                await FirebaseStorage.deleteFile({
                  path: fileUploadOptions.uri,
                });
              } catch (e1) {
                console.error('Error deleting temp file:', e1);
                this.errorHandler.handleError(e1);
              }
            }

            return resolve();
          } catch (r) {
            console.error('Error uploading image:', r);
            this.errorHandler.handleError(r);

            if (fileUploadOptions.uri) {
              try {
                await FirebaseStorage.deleteFile({
                  path: fileUploadOptions.uri,
                });
              } catch (e1) {
                console.error('Error deleting temp file:', e1);
                this.errorHandler.handleError(e1);
              }
            }

            return reject(error);
          }
        }
      });
    });
  }

  private async replaceImageInFirestoreStorage(
    imageBase64: string,
    imagePathInFirestore: string,
    biteId: string,
    biteWithoutImage: Omit<Bite, 'image'>,
    clearBase64Image = false,
  ): Promise<void> {
    const imagePath = storagePathFromDownloadUrl(imagePathInFirestore);

    await FirebaseStorage.deleteFile({
      path: imagePath,
    });

    await this.uploadImageAndUpdateBite(
      imageBase64,
      biteId,
      biteWithoutImage,
      clearBase64Image,
    );
  }

  private async loadBiteById(biteId: string): Promise<Bite> {
    const result = await FirebaseFirestore.getDocument({
      reference: `${BITE_COLLECTION}/${biteId}`,
    });

    return toBite(result.snapshot);
  }

  async loadBitesByBucketlist(bucketlist: Bucketlist): Promise<Bite[]> {
    const biteIds = bucketlist.biteIds || [];

    if (biteIds.length === 0) {
      return [];
    }

    const promises = biteIds.map(async (id) => {
      try {
        const result = await FirebaseFirestore.getDocument({
          reference: `${BITE_COLLECTION}/${id}`,
        });
        return toBite(result.snapshot);
      } catch (e) {
        console.error(`Failed loading bite ${id}:`, e);
        this.errorHandler.handleError(e);
        return null;
      }
    });

    const bites = await Promise.all(promises);
    return bites.filter((b): b is Bite => !!b);
  }
}
