import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent, IonText } from '@ionic/angular/standalone';
import { Bite } from 'model';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  dataUrlToBlob,
  getDownloadUrlFromFirebaseStorage,
  guessExtFromContentType,
} from 'utils';

export const uploadBlobWeb = async (
  blob: Blob,
  objectPath: string,
  opts?: { cacheControl?: string; customMetadata?: Record<string, string> }
): Promise<void> => {
  const metadata = {
    contentType: blob.type || 'application/octet-stream',
    cacheControl: opts?.cacheControl ?? 'public,max-age=31536000,immutable',
    customMetadata: opts?.customMetadata,
  };

  console.log('Blob type:', blob.type);
  console.log('Content type from metadata:', metadata.contentType);

  try {
    await FirebaseStorage.uploadFile(
      { path: objectPath, blob, metadata },
      (event, error) => {
        if (error) console.log(error);
        if (event?.completed) return console.log('Upload complete');
        // event.progress (0..1) is available if you want a UI
      }
    );
  } catch (e) {
    console.error(e);
  }
};

@Component({
  selector: 'btb-migrations',
  templateUrl: './migrations.html',
  styleUrl: './migrations.scss',
  imports: [PageComponent, IonContent, IonButton, IonText],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Migrations {
  bites = input<Bite[]>();
  isAuthenticated = input(false);

  async migrate(bite: Bite): Promise<void> {
    console.log('START MIGRATION FOR BITE', bite.name);

    const imageBase64 = bite.image;
    const parseImage = await dataUrlToBlob(imageBase64);

    console.log('PARSED IMAGE', parseImage);

    const { blob, contentType } = parseImage;
    const ext = guessExtFromContentType(contentType);

    console.log('GUESSED IMAGE CONTENT TYPE', ext);

    const collection = 'bites';
    const docId = bite.id;
    const objectPath = `images/${collection}/${docId}/${uuidv4()}.${ext}`;

    console.log('OBJECT PATH', objectPath);

    await uploadBlobWeb(blob, objectPath);

    const downloadUrl = await getDownloadUrlFromFirebaseStorage(objectPath);

    console.log('DOWNLOAD URL', downloadUrl);

    const migratedBite = {
      ...bite,
      imagePath: downloadUrl,
      updatedAt: new Date().toISOString(),
      updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
    };

    console.log('BITE -> MIGRATED BITE', bite, migratedBite);

    await FirebaseFirestore.updateDocument({
      reference: `${collection}/${docId}`,
      data: migratedBite,
    });
  }
}
