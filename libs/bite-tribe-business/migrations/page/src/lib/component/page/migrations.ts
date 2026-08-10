import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
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
import {
  NewVersionNotificationState,
  ReleasePlatform,
} from './new-version-notification';
import {
  COLLECTION_MIGRATIONS,
  CollectionMigrationName,
  CollectionMigrationStates,
} from './collection-migration';

const BITE_COLLECTION = 'bites';

const NEW_VERSION_STATUS_KEYS: Record<
  NewVersionNotificationState['status'],
  string
> = {
  sending: 'new-version-notification-sending',
  sent: 'new-version-notification-sent',
  failed: 'new-version-notification-failed',
};

@Component({
  selector: 'btb-migrations',
  templateUrl: './migrations.html',
  styleUrl: './migrations.scss',
  imports: [PageComponent, IonContent, IonButton, IonText, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Migrations {
  bites = input<Bite[]>();
  addressBackfillBites = input<Bite[]>([]);
  restaurantClusteringEligibleBites = input<Bite[]>([]);
  isAuthenticated = input(false);
  newVersionNotification = input<NewVersionNotificationState | null>(null);
  collectionMigrations = input<CollectionMigrationStates>({});
  clusterRestaurantCandidate = output<Bite>();
  backfillBiteAddress = output<Bite>();
  sendNewVersionNotification = output<ReleasePlatform>();
  runCollectionMigration = output<CollectionMigrationName>();

  /** The collection-wide migrations, in the order they are listed. */
  protected readonly collectionMigrationNames = COLLECTION_MIGRATIONS;

  /** True while a send is in flight, so neither button can fire twice. */
  isSendingNewVersionNotification = computed(
    () => this.newVersionNotification()?.status === 'sending',
  );

  /**
   * The Transloco key describing the last announcement, or `null` when none has
   * been triggered in this session.
   */
  newVersionNotificationStatusKey = computed(() => {
    const state = this.newVersionNotification();

    return state ? NEW_VERSION_STATUS_KEYS[state.status] : null;
  });

  /** Interpolation for the status message: which store, and how far it got. */
  newVersionNotificationStatusParams = computed(() => {
    const state = this.newVersionNotification();

    return {
      platform: state?.platform ?? '',
      tokenCount: state?.result?.tokenCount ?? 0,
      userCount: state?.result?.userCount ?? 0,
    };
  });

  bitesNeedingMigration = computed(() => {
    const bites = this.bites();

    return bites?.filter((bite) => !bite.imagePath || bite.image);
  });

  bitesWithoutGeohash = computed(() => {
    const bites = this.bites();

    return bites?.filter((bite) => !bite.geohash);
  });

  bitesNeedingAddressBackfill = computed(() => {
    const bites = this.addressBackfillBites();

    return bites?.filter((bite) => bite.addressStatus !== 'resolved');
  });

  /** What the last run of one migration did, or nothing if it never ran here. */
  protected migrationState(
    name: CollectionMigrationName,
  ): CollectionMigrationStates[CollectionMigrationName] {
    return this.collectionMigrations()[name];
  }

  /** True while a run is in flight, so the same migration cannot be doubled up. */
  protected isMigrationRunning(name: CollectionMigrationName): boolean {
    return this.migrationState(name)?.status === 'running';
  }

  /**
   * The counts a finished run reported, as label/value pairs.
   *
   * Every result is a flat set of counts, which is what lets one row render any
   * migration's outcome instead of each needing its own markup.
   */
  protected migrationCounts(
    name: CollectionMigrationName,
  ): { key: string; value: number }[] {
    const result = this.migrationState(name)?.result;

    return result
      ? Object.entries(result).map(([key, value]) => ({ key, value }))
      : [];
  }

  runMigration(name: CollectionMigrationName): void {
    this.runCollectionMigration.emit(name);
  }

  restaurantClusteringState(bite: Bite): string {
    return bite.geohash
      ? 'restaurant-clustering-state-ready'
      : 'restaurant-clustering-state-missing-geohash';
  }

  clusterCandidate(bite: Bite): void {
    this.clusterRestaurantCandidate.emit(bite);
  }

  backfillAddress(bite: Bite): void {
    this.backfillBiteAddress.emit(bite);
  }

  notifyNewVersion(platform: ReleasePlatform): void {
    this.sendNewVersionNotification.emit(platform);
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
