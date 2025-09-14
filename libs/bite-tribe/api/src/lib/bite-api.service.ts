import { ErrorHandler, inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import {
  dataUrlToBlob,
  getDownloadUrlFromFirebaseStorage,
  guessExtFromContentType,
  storagePathFromDownloadUrl,
} from 'utils';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { toBite } from './utils/to-bite';

export const BITE_COLLECTION = 'bites';

@Injectable({ providedIn: 'root' })
export class BiteApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly bitesChannel$ = new BehaviorSubject<any[]>([]);

  private readonly stopped$ = new Subject<void>();
  bitesCallbackId = '';

  public allBites$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap((isLoggedIn) => {
      if (isLoggedIn) {
        this.startBitesListener();
      } else {
        this.stopBitesListener(this.bitesCallbackId);
      }

      return this.bitesChannel$.pipe(skip(1), takeUntil(this.stopped$));
    })
  );

  private async startBitesListener(): Promise<void> {
    this.bitesCallbackId =
      await FirebaseFirestore.addCollectionSnapshotListener(
        { reference: BITE_COLLECTION },
        async (biteDocs) => {
          const bites =
            biteDocs?.snapshots.map((doc) => toBite(doc)) || ([] as Bite[]);

          this.bitesChannel$.next(bites);
        }
      );
  }

  private async stopBitesListener(callbackId: string): Promise<void> {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
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
    user: User | null | undefined
  ): Promise<string> {
    const doc = await FirebaseFirestore.addDocument({
      reference: BITE_COLLECTION,
      data: {
        ...biteDoc,
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
          biteWithoutImage
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
            biteWithoutImage
          );

          return;
        }
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
    try {
      if (bite.id) {
        const imagePathInFirestore = bite.imagePath;
        const imagePath = storagePathFromDownloadUrl(imagePathInFirestore);

        if (imagePath) {
          try {
            await FirebaseStorage.deleteFile({
              path: imagePath,
            });
          } catch (error) {
            console.error('Error deleting image:', error);
            this.errorHandler.handleError(error);
          }
        }

        await FirebaseFirestore.deleteDocument({
          reference: `${BITE_COLLECTION}/${bite.id}`,
        });
      }
    } catch (error) {
      console.error('Error deleting bite:', error);
      this.errorHandler.handleError(error);
    }
  }

  private async uploadImageAndUpdateBite(
    imageBase64: string,
    biteId: string,
    biteWithoutImage?: Omit<Bite, 'image'>
  ): Promise<void> {
    const { blob, contentType } = await dataUrlToBlob(imageBase64);
    const ext = guessExtFromContentType(contentType);

    const imageId = uuidv4();
    const imagePath = `images/${BITE_COLLECTION}/${biteId}/${imageId}.${ext}`;

    await FirebaseStorage.uploadFile(
      {
        path: imagePath,
        blob,
        metadata: {
          contentType: contentType,
          cacheControl: 'public,max-age=31536000,immutable',
        },
      },
      async (event, error) => {
        const downloadUrl = await getDownloadUrlFromFirebaseStorage(imagePath);

        await FirebaseFirestore.updateDocument({
          reference: `${BITE_COLLECTION}/${biteId}`,
          data: {
            ...(biteWithoutImage || {}),
            imagePath: downloadUrl,
          },
        });
      }
    );
  }

  private async replaceImageInFirestoreStorage(
    imageBase64: string,
    imagePathInFirestore: string,
    biteId: string,
    biteWithoutImage: Omit<Bite, 'image'>
  ): Promise<void> {
    const imagePath = storagePathFromDownloadUrl(imagePathInFirestore);

    await FirebaseStorage.deleteFile({
      path: imagePath,
    });

    await this.uploadImageAndUpdateBite(imageBase64, biteId, biteWithoutImage);
  }
}
