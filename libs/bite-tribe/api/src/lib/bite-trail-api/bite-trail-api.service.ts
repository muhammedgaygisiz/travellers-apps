import { Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { BiteTrail } from 'model';
import { BITE_TRAIL_COLLECTION } from '../utils/constants';
import { uploadBase64ToFirebaseStorage } from '../utils/upload-base64-to-firebase-storage';
import { getDownloadUrlFromFirebaseStorage } from 'utils';

@Injectable({ providedIn: 'root' })
export class BiteTrailApiService {
  async createBiteTrail(
    trailData: Omit<
      BiteTrail,
      | 'id'
      | 'createdAt'
      | 'createdAtTimestamp'
      | 'updatedAt'
      | 'updatedAtTimestamp'
    >,
  ): Promise<void> {
    const { image, ...trailDataWithoutImage } = trailData;
    const now = new Date().toISOString();
    const nowTimestamp = Date.now();

    const addResult = await FirebaseFirestore.addDocument({
      reference: BITE_TRAIL_COLLECTION,
      data: {
        ...trailDataWithoutImage,
        createdAt: now,
        createdAtTimestamp: nowTimestamp,
        updatedAt: now,
        updatedAtTimestamp: nowTimestamp,
      },
    });

    if (image) {
      await this.uploadAndSaveTrailImage(addResult.reference.id, image);
    }
  }

  private async uploadAndSaveTrailImage(
    trailId: string,
    image: string,
  ): Promise<void> {
    const storagePath = await uploadBase64ToFirebaseStorage({
      base64: image,
      docId: trailId,
      collection: BITE_TRAIL_COLLECTION,
    });

    const imagePath = await getDownloadUrlFromFirebaseStorage(storagePath);

    await FirebaseFirestore.updateDocument({
      reference: `${BITE_TRAIL_COLLECTION}/${trailId}`,
      data: {
        imagePath,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });
  }
}
