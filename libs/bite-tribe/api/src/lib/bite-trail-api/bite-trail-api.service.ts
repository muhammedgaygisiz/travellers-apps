import { ErrorHandler, inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { BiteTrail, FolderPhotoVerdict } from 'model';
import type { Observable } from 'rxjs';
import { BITE_TRAIL_COLLECTION } from '../utils/constants';
import { uploadBase64ToFirebaseStorage } from '../utils/upload-base64-to-firebase-storage';
import { folderPhotoVerdict$ } from '../utils/folder-photo-verdict';

@Injectable({ providedIn: 'root' })
export class BiteTrailApiService {
  private readonly errorHandler = inject(ErrorHandler);

  /**
   * Creates a trail and uploads its photo, answering the trail's id.
   *
   * The trail never carries its own photo (GitHub issue #2141): it is written
   * `pending`, the photo uploads into its folder, and the finalize trigger
   * `setBiteTrailImagePathOnUpload` publishes it once the image check passed
   * it, or marks it `refused`. An upload that fails marks the trail `failed`
   * and is thrown, so the page can say so.
   */
  async createBiteTrail(
    trailData: Omit<
      BiteTrail,
      | 'id'
      | 'createdAt'
      | 'createdAtTimestamp'
      | 'updatedAt'
      | 'updatedAtTimestamp'
    >,
  ): Promise<string> {
    const {
      image,
      imagePath: _imagePath,
      imageStatus: _imageStatus,
      imageRefusalCategory: _imageRefusalCategory,
      ...trailDataWithoutImage
    } = trailData;
    void _imagePath;
    void _imageStatus;
    void _imageRefusalCategory;
    const now = new Date().toISOString();
    const nowTimestamp = Date.now();

    const addResult = await FirebaseFirestore.addDocument({
      reference: BITE_TRAIL_COLLECTION,
      data: {
        ...trailDataWithoutImage,
        ...(image ? { imageStatus: 'pending' } : {}),
        createdAt: now,
        createdAtTimestamp: nowTimestamp,
        updatedAt: now,
        updatedAtTimestamp: nowTimestamp,
      },
    });
    const trailId = addResult.reference.id;

    if (image) {
      await this.uploadTrailImage(trailId, image);
    }

    return trailId;
  }

  /** The image check's verdict on the trail's photo (GitHub issue #2141). */
  photoVerdict$(biteTrailId: string): Observable<FolderPhotoVerdict> {
    return folderPhotoVerdict$(
      `${BITE_TRAIL_COLLECTION}/${biteTrailId}`,
      { afterPending: false },
      (error) => this.errorHandler.handleError(error),
    );
  }

  private async uploadTrailImage(
    trailId: string,
    image: string,
  ): Promise<void> {
    try {
      await uploadBase64ToFirebaseStorage({
        base64: image,
        docId: trailId,
        collection: BITE_TRAIL_COLLECTION,
      });
    } catch (error) {
      await FirebaseFirestore.updateDocument({
        reference: `${BITE_TRAIL_COLLECTION}/${trailId}`,
        data: { imageStatus: 'failed' },
      }).catch(() => undefined);

      throw error;
    }
  }
}
