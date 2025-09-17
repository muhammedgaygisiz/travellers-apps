import { ErrorHandler, inject, Injectable, signal } from '@angular/core';
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
import {
  FirebaseStorage,
  UploadFileOptions,
} from '@capacitor-firebase/storage';
import { toBite } from './utils/to-bite';
import { Platform } from '@ionic/angular';
import { Directory, Filesystem } from '@capacitor/filesystem';

const getBlobUri = async (blob: Blob, fileName: string): Promise<string> => {
  // Convert blob to base64
  const buffer = await blob.arrayBuffer();
  const base64Data = btoa(
    new Uint8Array(buffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );

  // Write to temporary file
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Cache,
  });

  return savedFile.uri;
};

export const BITE_COLLECTION = 'bites';

@Injectable({ providedIn: 'root' })
export class BiteApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly platform = inject(Platform);

  private readonly bitesChannel$ = new BehaviorSubject<any[]>([]);

  private readonly stopped$ = new Subject<void>();
  bitesCallbackId = '';

  isWeb = signal(!this.platform.is('hybrid'));

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
            { ...biteWithoutImage }
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
          true
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
    try {
      if (bite.id) {
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
    biteWithoutImage?: Omit<Bite, 'image'>,
    clearBase64Image = false
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
      fileUploadOptions.uri = await getBlobUri(blob, `${imageId}.${ext}`);
    }

    await FirebaseStorage.uploadFile(
      fileUploadOptions,
      async (event, error) => {
        if (error) {
          console.error('Error uploading image:', error);
          this.errorHandler.handleError(error);
        }

        if (event?.completed) {
          const downloadUrl = await getDownloadUrlFromFirebaseStorage(
            imagePath
          );

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
      }
    );
  }

  private async replaceImageInFirestoreStorage(
    imageBase64: string,
    imagePathInFirestore: string,
    biteId: string,
    biteWithoutImage: Omit<Bite, 'image'>,
    clearBase64Image = false
  ): Promise<void> {
    const imagePath = storagePathFromDownloadUrl(imagePathInFirestore);

    await FirebaseStorage.deleteFile({
      path: imagePath,
    });

    await this.uploadImageAndUpdateBite(
      imageBase64,
      biteId,
      biteWithoutImage,
      clearBase64Image
    );
  }
}
