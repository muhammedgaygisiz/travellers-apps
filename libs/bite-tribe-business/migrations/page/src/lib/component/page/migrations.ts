import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
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
import { geohashForLocation } from 'geofire-common';

const BITE_COLLECTION = 'bites';

@Component({
  selector: 'btb-migrations',
  templateUrl: './migrations.html',
  styleUrl: './migrations.scss',
  imports: [PageComponent, IonContent, IonButton, IonText, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Migrations {
  bites = input<Bite[]>();
  restaurantClusteringEligibleBites = input<Bite[]>([]);
  isAuthenticated = input(false);

  bitesNeedingMigration = computed(() => {
    const bites = this.bites();

    return bites?.filter((bite) => !bite.imagePath || bite.image);
  });

  bitesWithoutGeohash = computed(() => {
    const bites = this.bites();

    return bites?.filter((bite) => !bite.geohash);
  });

  restaurantClusteringState(bite: Bite): string {
    return bite.geohash
      ? 'restaurant-clustering-state-ready'
      : 'restaurant-clustering-state-missing-geohash';
  }

  async migrate(bite: Bite): Promise<void> {
    console.log('START MIGRATION FOR BITE', bite.name);

    const imageBase64 = bite.image;
    const parseImage = await dataUrlToBlob(imageBase64);

    console.log('PARSED IMAGE', parseImage);

    const { blob, contentType } = parseImage;
    const ext = guessExtFromContentType(contentType);

    console.log('GUESSED IMAGE CONTENT TYPE', ext);

    const docId = bite.id;
    const objectPath = `images/${BITE_COLLECTION}/${docId}/${uuidv4()}.${ext}`;

    console.log('OBJECT PATH', objectPath);

    const metadata = {
      contentType: blob.type || 'application/octet-stream',
      cacheControl: 'public,max-age=31536000,immutable',
    };

    console.log('Blob type:', blob.type);
    console.log('Content type from metadata:', metadata.contentType);

    try {
      await FirebaseStorage.uploadFile(
        { path: objectPath, blob, metadata },
        async (event, error) => {
          if (error) {
            console.log(error);
          }

          if (event?.completed) {
            console.log('Upload complete');

            await this.updateBiteWithImagePath(objectPath, bite, docId);
          }
          // event.progress (0..1) is available if you want a UI
        },
      );
    } catch (e) {
      console.error(e);
    }
  }

  private async updateBiteWithImagePath(
    objectPath: string,
    bite: Bite,
    docId: string,
  ): Promise<void> {
    const downloadUrl = await getDownloadUrlFromFirebaseStorage(objectPath);

    console.log('DOWNLOAD URL', downloadUrl);

    const migratedBite = {
      ...bite,
      image: '', // clear base64 image
      imagePath: downloadUrl,
      updatedAt: new Date().toISOString(),
      updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
    };

    console.log('BITE -> MIGRATED BITE', bite, migratedBite);

    await FirebaseFirestore.updateDocument({
      reference: `${BITE_COLLECTION}/${docId}`,
      data: migratedBite,
    });
  }

  async addGeohash(bite: Bite): Promise<void> {
    console.log(bite);

    const position = bite.position;
    const gh = geohashForLocation([position.latitude, position.longitude]);
    console.log('GEOHASH', gh);

    const biteWithGeohash = {
      ...bite,
      geohash: gh,
      updatedAt: new Date().toISOString(),
      updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
    };

    console.log('BITE WITH GEOHASH', biteWithGeohash);

    const docId = bite.id;

    await FirebaseFirestore.updateDocument({
      reference: `${BITE_COLLECTION}/${docId}`,
      data: biteWithGeohash,
    });
  }
}
