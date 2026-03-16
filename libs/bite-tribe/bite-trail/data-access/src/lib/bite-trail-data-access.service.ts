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

  private readonly _sorting = signal<string>('distance');
  private readonly _tagFilters = signal<string[]>([]);

  sorting = this._sorting.asReadonly();
  tagFilters = this._tagFilters.asReadonly();

  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  gpsPosition = toSignal(this.storeService.position$);

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

  sortedBites = computed(() => {
    const bites = this.bitesWithDistance();
    const sorting = this._sorting();
    const tagFilters = this._tagFilters();

    const filtered = this.applyTagFilters(bites, tagFilters);

    return this.sortBites(filtered, sorting);
  });

  setSorting(sorting: string): void {
    this._sorting.set(sorting);
  }

  setFilters(filters: {
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }): void {
    this._tagFilters.set(filters.tagFilters);
  }

  clearFilters(): void {
    this._tagFilters.set([]);
  }

  private applyTagFilters(bites: Bite[], tagFilters: string[]): Bite[] {
    if (!tagFilters.length) {
      return bites;
    }

    return bites.filter((bite) => {
      const tags = bite.tags ?? [];

      return tagFilters.every((filter) =>
        tags.some((tag) => tag.toLowerCase().includes(filter.toLowerCase())),
      );
    });
  }

  private sortBites(bites: Bite[], sorting: string): Bite[] {
    const sorted = [...bites];

    switch (sorting) {
      case 'distance':
        return sorted.sort((a, b) => {
          const da = a.distance ? parseFloat(a.distance) : Infinity;
          const db = b.distance ? parseFloat(b.distance) : Infinity;

          return da - db;
        });
      case 'likes':
        return sorted.sort(
          (a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0),
        );
      case 'createdAt':
        return sorted.sort(
          (a, b) => (b.createdAtTimestamp ?? 0) - (a.createdAtTimestamp ?? 0),
        );
      case 'rating':
        return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case 'price':
        return sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      default:
        return sorted;
    }
  }
}
