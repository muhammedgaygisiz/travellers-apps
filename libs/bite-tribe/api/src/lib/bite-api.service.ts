import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
import { BehaviorSubject, skip, Subject } from 'rxjs';
import { AuthService } from 'ta-firestore';
import {
  FirebaseFirestore,
  GetCollectionResult,
} from '@capacitor-firebase/firestore';
import { Bite } from 'model';
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
import { toBite } from './utils/to-bite';
import { Platform } from '@ionic/angular';
import { getBlobWithUri } from './utils/get-blob-with-uri';
import {
  geohashForLocation,
  geohashQueryBounds,
  distanceBetween,
  Geopoint,
} from 'geofire-common';

export const BITE_COLLECTION = 'bites';

// TODO: Now that we do not load all bites
//       We have to load my-bites and bites in bucket-lists differently.
//       I am thinking of loading them, when entering my-bites page
//       and accordingly when entering the bucket list.
//       This is an essential switch in our app, because access to more
//       is going to be part of subscriptions.

@Injectable({ providedIn: 'root' })
export class BiteApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly platform = inject(Platform);

  private readonly _bitesChannel$ = new BehaviorSubject<Bite[]>([]);
  bites$ = this._bitesChannel$.asObservable().pipe(skip(1));

  isWeb = signal(!this.platform.is('hybrid'));

  /**
   * Loading of the bites using geohashs are done according
   * https://firebase.google.com/docs/firestore/solutions/geoqueries#web_4
   *
   * @param myposition
   */
  public async loadBites(myposition?: GeolocationPosition): Promise<void> {
    const radiusInM = 15 * 1000;

    const coords = myposition?.coords;
    if (coords) {
      const matchingBites: Bite[] = [];
      const center: Geopoint = [coords.latitude, coords.longitude];
      const bounds = geohashQueryBounds(center, radiusInM);

      const promises: Promise<GetCollectionResult<any>>[] = [];
      for (const b of bounds) {
        promises.push(
          FirebaseFirestore.getCollection({
            reference: BITE_COLLECTION,
            compositeFilter: {
              type: 'and',
              queryConstraints: [
                {
                  type: 'where',
                  fieldPath: 'geohash',
                  opStr: '>=',
                  value: b[0],
                },
                {
                  type: 'where',
                  fieldPath: 'geohash',
                  opStr: '<=',
                  value: b[1],
                },
              ],
            },
            queryConstraints: [
              {
                type: 'orderBy',
                fieldPath: 'geohash',
                directionStr: 'asc',
              },
            ],
          }),
        );
      }

      const snapshots = await Promise.all(promises);

      for (const snapshot of snapshots) {
        for (const document of snapshot.snapshots) {
          const bite = toBite(document);
          const position = bite.position;

          const distanceInKm = distanceBetween(
            [position.latitude, position.longitude],
            center,
          );
          const distanceInM = distanceInKm * 1000;
          if (distanceInM <= radiusInM) {
            matchingBites.push(bite);
          }
        }
      }

      this._bitesChannel$.next(matchingBites);
      return;
    }
  }

  async saveNewBite(bite: Bite): Promise<void> {
    try {
      const user = this.getUser();

      const { image, ...biteDocWithoutImage } = bite;

      const biteId = await this.createNewBite(biteDocWithoutImage, user);

      await this.uploadImageAndUpdateBite(image, biteId);
    } catch (error) {
      console.error('Error saving new bite:', error);
      this.errorHandler.handleError(error);
    }
  }

  private async createNewBite(
    biteDoc: Omit<Bite, 'image'>,
    user: User | null | undefined,
  ): Promise<string> {
    const gh = geohashForLocation([
      biteDoc.position.latitude,
      biteDoc.position.longitude,
    ]);

    const doc = await FirebaseFirestore.addDocument({
      reference: BITE_COLLECTION,
      data: {
        ...biteDoc,
        geohash: gh,
        userId: user?.uid || '',
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    return doc.reference.id;
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

  async deleteBite(bite: any): Promise<void> {
    if (!bite.id) {
      return;
    }

    try {
      const imagePathInFirestore = bite.imagePath;
      const imagePath = storagePathFromDownloadUrl(imagePathInFirestore);
      if (imagePath) {
        await FirebaseStorage.deleteFile({
          path: imagePath,
        });
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
    }
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
      const writeFileResult = await getBlobWithUri(blob, `${imageId}.${ext}`);
      fileUploadOptions.uri = writeFileResult.uri;
    }

    await FirebaseStorage.uploadFile(
      fileUploadOptions,
      async (event, error) => {
        if (error) {
          console.error('Error uploading image:', error);
          this.errorHandler.handleError(error);
        }

        if (event?.completed) {
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
        }

        if (fileUploadOptions.uri) {
          try {
            await FirebaseStorage.deleteFile({ path: fileUploadOptions.uri });
          } catch (error) {
            console.error('Error deleting temp file:', error);
            this.errorHandler.handleError(error);
          }
        }
      },
    );
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
}
