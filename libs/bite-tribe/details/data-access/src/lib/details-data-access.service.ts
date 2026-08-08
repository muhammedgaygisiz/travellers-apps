import {
  computed,
  effect,
  inject,
  Injectable,
  resource,
  ResourceLoader,
} from '@angular/core';
import { Router } from '@angular/router';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { CrashReportingService } from 'ta-firestore';
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
import { BiteNotFoundError } from './bite-not-found-error';
import { BiteLoadFailure, classifyBiteLoadFailure } from './bite-load-failure';

const SHARE_BITE_URL = 'https://bite-tribe.web.app/s/bite';

// The bite document read can transiently fail or hang right after a cold start
// from a push notification (Firestore/auth not ready yet). Retry it silently so
// the page keeps showing its loading skeleton and recovers on its own, instead
// of getting stuck or forcing the user to act.
const BITE_LOAD_ATTEMPTS = 5;
const BITE_LOAD_TIMEOUT_MS = 8000;
const BITE_LOAD_RETRY_DELAY_MS = 700;

/** What a Bite read needs. Undefined means nothing was asked for at all. */
type BiteRequest = { biteId: string; userId?: string };

@Injectable({
  providedIn: 'root',
})
export class DetailsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly crashReporting = inject(CrashReportingService);
  private readonly router = inject(Router);

  userId = toSignal(this.storeService.userId$, { initialValue: '' });

  biteLoader: ResourceLoader<Bite | undefined, BiteRequest | undefined> =
    async ({ params }) => {
      const biteId = params.biteId;
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

      if (!res.snapshot.data) {
        throw new BiteNotFoundError(biteId);
      }

      return {
        ...res.snapshot.data,
        likes,
        id: res.snapshot.id,
      } as Bite;
    };

  /**
   * What the resource is being asked for, or nothing at all.
   *
   * The `bite/:biteId` route always carries an id, so a missing one means the
   * app is simply not on a Bite page — while leaving it, for instance. That has
   * to stay distinguishable from a Bite that could not be read: running the
   * loader for it resolved the resource *successfully* with no Bite, which the
   * page could not tell apart from still loading and answered with an endless
   * skeleton. Undefined params keep the resource idle instead. See GitHub issue
   * #1232.
   */
  biteParams = (): BiteRequest | undefined => {
    const biteId = this.storeService.biteIdFromUrl();

    return biteId ? { biteId, userId: this.userId() } : undefined;
  };

  bite = resource({
    params: this.biteParams,
    loader: this.biteLoader.bind(this),
  });

  /**
   * The loaded Bite, or nothing at all.
   *
   * `ResourceRef.value()` *throws* once its resource is in an error state, and
   * the page read it straight out of the template. A failed read therefore blew
   * up the whole binding update — including the very input that reports the
   * failure — so nothing reached the page and its loading skeleton ran forever
   * with nothing to explain it. Everything outside this library reads the Bite
   * through here. See GitHub issue #1232.
   */
  biteValue = computed(() =>
    this.bite.hasValue() ? this.bite.value() : undefined,
  );

  /** Why the settled read produced no Bite, if it produced none. */
  biteLoadFailure = computed<BiteLoadFailure | undefined>(() =>
    classifyBiteLoadFailure(
      this.bite.status(),
      this.biteValue(),
      this.bite.error(),
    ),
  );

  /** True once the read has come back and the Bite is gone for good. */
  biteNotFound = computed(() => this.biteLoadFailure() === 'not-found');

  /** True once the read itself failed, which says nothing about the Bite. */
  biteUnavailable = computed(() => this.biteLoadFailure() === 'unavailable');

  private lastReportedFailure: string | undefined;

  /**
   * Files a non-fatal for every settled read that produced no Bite.
   *
   * A device run can see the page fail but not which branch failed, since they
   * all look the same from the outside, and a user who is only shown a message
   * cannot report a timeout or a rejected read in a usable form. The `biteId`,
   * the branch and where the navigation came from are carried along, because
   * the gallery, a deep link and a push notification reach this page
   * differently. See GitHub issue #1232.
   */
  private readonly reportBiteLoadFailure = effect(() => {
    const failure = this.biteLoadFailure();

    if (!failure) {
      this.lastReportedFailure = undefined;

      return;
    }

    const biteId = this.storeService.biteIdFromUrl();
    const key = `${biteId}:${failure}`;

    if (this.lastReportedFailure === key) {
      return;
    }

    this.lastReportedFailure = key;

    const error = this.bite.error();

    void this.crashReporting.recordNonFatal('Bite details load failed', {
      biteId,
      branch: failure,
      origin: this.navigationOrigin(),
      error: error instanceof Error ? `${error.name}: ${error.message}` : '',
    });
  });

  /** The page navigated away from, which identifies how this page was reached. */
  private navigationOrigin(): string {
    const previous = this.router.lastSuccessfulNavigation()?.previousNavigation;

    return (
      previous?.finalUrl?.toString() ??
      previous?.extractedUrl?.toString() ??
      'direct'
    );
  }

  /** Re-runs a read that failed, for the page's try-again action. */
  reloadBite(): void {
    this.bite.reload();
  }

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
    const bite = this.biteValue();
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

  /**
   * The Bite's creator, if the read produced one. Same hazard as `biteValue`: a
   * rejected user read would otherwise throw out of the page's template and
   * take the whole Bite down with it, over a name and an avatar.
   */
  biteCreatorValue = computed(() =>
    this.biteCreator.hasValue() ? this.biteCreator.value() : undefined,
  );

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
