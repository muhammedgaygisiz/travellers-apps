import {
  computed,
  inject,
  Injectable,
  resource,
  ResourceLoader,
  signal,
} from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { Bite, BiteTrail, Geopoint } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { haversineDistance } from 'utils';

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

  biteTrailName = computed(() => this.biteTrail.value()?.name ?? '');

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
    params: () => ({
      biteIds: this.biteTrail.value()?.biteIds,
    }),
    loader: this.bitesLoader.bind(this),
  });

  bitesWithDistance = computed(() => {
    const bites = this.bites.value() ?? [];
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
