import {
  computed,
  inject,
  Injectable,
  resource,
  ResourceLoader,
} from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Bite,
  Like,
  LikeClick,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  SaveToBucketListParams,
} from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Position } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import { lastValueFrom } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { retry, withTimeout } from './async-retry';

const SHARE_BITE_URL = 'https://bite-tribe.web.app/s/bite';

// The bite document read can transiently fail or hang right after a cold start
// from a push notification (Firestore/auth not ready yet). Retry it silently so
// the page keeps showing its loading skeleton and recovers on its own, instead
// of getting stuck or forcing the user to act.
const BITE_LOAD_ATTEMPTS = 5;
const BITE_LOAD_TIMEOUT_MS = 8000;
const BITE_LOAD_RETRY_DELAY_MS = 700;

@Injectable({
  providedIn: 'root',
})
export class DetailsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  userId = toSignal(this.storeService.userId$, { initialValue: '' });

  biteLoader: ResourceLoader<
    Bite | undefined,
    { biteId?: string; userId?: string }
  > = async ({ params }) => {
    const biteId = params.biteId;
    if (biteId) {
      let likes: Like[] = [];
      const userId = params.userId;

      if (userId) {
        try {
          const likeDoc = await withTimeout(
            FirebaseFirestore.getDocument({
              reference: `bites/${biteId}/likes/${userId}`,
            }),
            BITE_LOAD_TIMEOUT_MS,
          );

          likes = likeDoc.snapshot.data ? [likeDoc.snapshot.data as Like] : [];
        } catch {
          // The like state is non-essential: never let it block the bite from
          // loading (e.g. cold start from a push notification before auth is
          // fully ready). Fall back to no likes.
          likes = [];
        }
      }

      const res = await retry(
        () =>
          withTimeout(
            FirebaseFirestore.getDocument({ reference: `bites/${biteId}` }),
            BITE_LOAD_TIMEOUT_MS,
          ),
        BITE_LOAD_ATTEMPTS,
        BITE_LOAD_RETRY_DELAY_MS,
      );

      return {
        ...res.snapshot.data,
        likes,
        id: res.snapshot.id,
      } as Bite;
    }

    return undefined;
  };

  bite = resource({
    params: () => ({
      biteId: this.storeService.biteIdFromUrl(),
      userId: this.userId(),
    }),
    loader: this.biteLoader.bind(this),
  });

  reviews = toSignal(this.storeService.reviews$, { initialValue: [] });
  bucketlists = toSignal(this.storeService.bucketlists$, {
    initialValue: [],
  });
  exchangeRates = toSignal(this.storeService.exchangeRates$);
  preferredCurrency = toSignal(this.storeService.preferedCurrency$);
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  biteCreatorId = computed(() => {
    const bite = this.bite.value();
    return bite?.userId;
  });

  biteCreatorLoader: ResourceLoader<
    PublicUser | undefined,
    { userId?: string }
  > = ({ params }) => {
    const userId = params.userId;
    if (userId) {
      return FirebaseFirestore.getDocument({
        reference: `users/${userId}`,
      }).then((res) => res.snapshot.data as PublicUser);
    }

    return Promise.resolve(undefined);
  };

  /**
   * Reads the position for the distance shown on a Bite. The shared reader only
   * resolves on an existing grant and never prompts: the OS ask belongs to the
   * onboarding location step (epic #850, issue #1023). An undecided or denied
   * permission surfaces as an error here, which is the same non-fatal outcome as
   * any other position failure — the page simply shows no distance.
   */
  positionLoader: ResourceLoader<Position | undefined, unknown> = async () => {
    try {
      return await lastValueFrom(getCurrentPosition());
    } catch (error) {
      console.error('Error getting position:', error);

      return undefined;
    }
  };

  biteCreator = resource({
    params: () => ({
      userId: this.biteCreatorId(),
    }),
    loader: this.biteCreatorLoader.bind(this),
  });

  position = resource({
    loader: this.positionLoader.bind(this),
  });

  saveNewReview(newReview: { review: string; biteId: string }): void {
    this.storeService.saveReview(newReview);
  }

  saveToBucketList(saveToBucketListEvent: SaveToBucketListParams): void {
    this.storeService.saveToBucketList(saveToBucketListEvent);
  }

  createAndSaveToBucketList(param: {
    bucketListName: string;
    biteId: string | undefined;
  }): void {
    this.storeService.createAndSaveToBucketList(param);
  }

  removeBiteFromBucketlist($event: RemoveBiteFromBucketlistParams): void {
    this.storeService.removeBiteFromBucketlist($event);
  }

  submitLikeClick(likeClick: LikeClick): void {
    this.storeService.submitLikeClick(likeClick);
  }

  logout(): void {
    this.storeService.logout();
  }

  cacheBite(bite: Partial<Bite>): void {
    this.storeService.cacheBite(bite);
  }

  async shareBite(bite: Bite): Promise<void> {
    const url = `${SHARE_BITE_URL}/${encodeURIComponent(bite.id)}`;

    const title = bite.place ? `${bite.name} @ ${bite.place}` : bite.name;

    const parts = [];
    if (bite.price) {
      parts.push(`${bite.currency} ${bite.price}`);
    }

    if (bite.rating) {
      parts.push(`⭐️ ${bite.rating}`);
    }

    const text = `${parts.length ? parts.join(' · ') : 'Check out this Bite on BiteTribe 👇'}\n${url}`;

    await Share.share({
      title,
      text,
      url,
      dialogTitle: 'Share Bite',
    });
  }
}
