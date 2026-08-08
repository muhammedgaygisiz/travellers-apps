import {
  computed,
  inject,
  Injectable,
  resource,
  ResourceLoader,
} from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { Bite, BiteTrail, Geopoint } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { haversineDistance, resourceFailed, resourceValue } from 'utils';

const BITE_TRAIL_COLLECTION = 'biteTrails';
const BITE_COLLECTION = 'bites';

@Injectable({ providedIn: 'root' })
export class BiteTrailDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  gpsPosition = toSignal(this.storeService.position$);
  biteTrailIdFromUrl = this.storeService.biteTrailIdFromUrl;
  bucketlists = toSignal(this.storeService.bucketlists$, { initialValue: [] });

  biteTrailLoader: ResourceLoader<
    BiteTrail | undefined,
    { biteTrailId: string | undefined }
  > = async ({ params }) => {
    const { biteTrailId } = params;

    if (!biteTrailId) {
      return undefined;
    }

    const doc = await FirebaseFirestore.getDocument({
      reference: `${BITE_TRAIL_COLLECTION}/${biteTrailId}`,
    });

    if (!doc.snapshot.data) {
      return undefined;
    }

    return {
      id: doc.snapshot.id,
      ...doc.snapshot.data,
    } as BiteTrail;
  };

  biteTrail = resource({
    params: () => ({
      biteTrailId: this.storeService.biteTrailIdFromUrl(),
    }),
    loader: this.biteTrailLoader.bind(this),
  });

  /**
   * The trail, or nothing. `value()` throws once the read has failed, and this
   * one is read from three computeds and a resource's params, so an unguarded
   * read took the page down rather than reporting anything. See GitHub issue
   * #1232.
   */
  biteTrailValue = resourceValue(this.biteTrail);

  /** True once the trail read failed, so the page can say so. */
  biteTrailFailed = resourceFailed(this.biteTrail);

  biteTrailName = computed(() => this.biteTrailValue()?.name ?? '');

  isFree = computed(() => (this.biteTrailValue()?.price ?? -1) === 0);

  savedBucketlistId = computed(() => {
    const biteTrailId = this.biteTrailIdFromUrl();
    const bucketlists = this.bucketlists();
    const found = bucketlists.find((bl) => bl.biteTrailId === biteTrailId);
    return found?.id ?? null;
  });

  saveBiteTrailAsBucketList(): void {
    const biteTrail = this.biteTrailValue();

    if (!biteTrail) {
      return;
    }

    this.storeService.saveBiteTrailAsBucketList({
      bucketListName: biteTrail.name,
      biteIds: biteTrail.biteIds,
      biteTrailId: biteTrail.id,
    });
  }

  bitesLoader: ResourceLoader<Bite[], { biteIds: string[] | undefined }> =
    async ({ params }) => {
      const { biteIds } = params;

      if (!biteIds?.length) {
        return [];
      }

      const promises = biteIds.map((id) =>
        FirebaseFirestore.getDocument({
          reference: `${BITE_COLLECTION}/${id}`,
        }).then((doc) => {
          if (!doc.snapshot.data) {
            return null;
          }

          return {
            id: doc.snapshot.id,
            ...doc.snapshot.data,
          } as Bite;
        }),
      );

      const bites = await Promise.all(promises);

      return bites.filter((b): b is Bite => b !== null);
    };

  bites = resource({
    // Guarded like every other read of the trail: a params function that throws
    // would leave this resource permanently stuck as well.
    params: () => ({
      biteIds: this.biteTrailValue()?.biteIds,
    }),
    loader: this.bitesLoader.bind(this),
  });

  /** The trail's Bites, or none while the read is running or has failed. */
  bitesValue = resourceValue(this.bites, [] as Bite[]);

  private readonly bitesReadFailed = resourceFailed(this.bites);

  /** True once either read failed: the page has no Bites to show either way. */
  bitesFailed = computed(
    () => this.biteTrailFailed() || this.bitesReadFailed(),
  );

  /** Runs the failed reads again, for the page's try-again action. */
  reload(): void {
    this.biteTrail.reload();
    this.bites.reload();
  }

  bitesWithDistance = computed(() => {
    const bites = this.bitesValue();
    const position = this.gpsPosition() as Geopoint | null | undefined;

    return bites.map(
      (bite) =>
        ({
          ...bite,
          distance: haversineDistance(
            bite.position?.latitude,
            bite.position?.longitude,
            position?.latitude,
            position?.longitude,
            'km',
          ),
        }) as Bite,
    );
  });
}
