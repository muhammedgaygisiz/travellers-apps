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
import { BiteTribeApiService, toBase64 } from 'bite-tribe/api';
import { CrashReportingService } from 'ta-firestore';
import { resourceValue, sharedBiteUrl } from 'utils';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Bite,
  BiteReportReason,
  Like,
  LikeClick,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  ReportBiteResult,
  SaveToBucketListParams,
} from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Position } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { lastValueFrom } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { retry, withTimeout } from './async-retry';
import { BiteNotFoundError } from './bite-not-found-error';
import {
  SOCIAL_SHARE_PERMISSION_DENIED,
  SOCIAL_SHARE_UNAVAILABLE,
  SocialShare,
  type SocialShareFile,
  type SocialShareTarget,
} from 'social-share';
import {
  SaveImageDeniedError,
  ShareImageUnavailableError,
  ShareTargetUnavailableError,
} from './share-image-errors';

/**
 * The local plugin of the native wrappers that saves a share image to the
 * photo library: add-only on iOS, `MediaStore` on Android (issue #1732). It is
 * registered by the wrappers themselves, not installed from npm.
 */
interface SaveImagePlugin {
  saveToPhotos(options: { path: string }): Promise<void>;
}

const SaveImage = registerPlugin<SaveImagePlugin>('SaveImage');

const shareImageFileName = (bite: Bite): string => `bitetribe-${bite.id}.jpg`;

/** The native hand-off behind each app target (issue #1730). */
const HAND_OFF: Record<
  SocialShareTarget,
  (file: SocialShareFile) => Promise<void>
> = {
  'instagram-story': (file) => SocialShare.shareToInstagramStory(file),
  'instagram-post': (file) => SocialShare.shareToInstagramFeed(file),
  'facebook-story': (file) => SocialShare.shareToFacebookStory(file),
};

/** Hands a blob to the browser as a file download. */
const downloadImage = (image: Blob, fileName: string): void => {
  const url = URL.createObjectURL(image);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked after the click has been handled, so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
import {
  BiteLoadFailure,
  classifyBiteLoadFailure,
  describeBiteLoadError,
} from './bite-load-failure';

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
  private readonly api = inject(BiteTribeApiService);
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
  biteValue = resourceValue(this.bite);

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

    void this.crashReporting.recordNonFatal('Bite details load failed', {
      biteId,
      branch: failure,
      origin: this.navigationOrigin(),
      error: describeBiteLoadError(this.bite.error()),
    });
  });

  /**
   * The page navigated away from, which identifies how this page was reached.
   * Nothing before it means the app opened straight onto the Bite — a deep link
   * or a tapped notification rather than the gallery or the feed.
   */
  private navigationOrigin(): string {
    const previous = this.router.lastSuccessfulNavigation()?.previousNavigation;

    return previous ? previous.extractedUrl.toString() : 'direct';
  }

  /** Re-runs a read that failed, for the page's try-again action. */
  reloadBite(): void {
    this.bite.reload();
  }

  /**
   * The Bite's reviews grouped into conversations, as the page renders them.
   * The flat list is not exposed: every reader of the compartment now needs the
   * threads, and two shapes of the same data would drift (issue #1283).
   */
  reviewThreads = toSignal(this.storeService.reviewThreads$, {
    initialValue: [],
  });

  /**
   * The thread a tapped reply notification asked for, if the page was reached
   * that way. The compartment opens and highlights it instead of leaving the
   * reply somewhere below the fold (issue #1283).
   */
  highlightedThreadId = toSignal(this.storeService.highlightedThreadIdFromUrl$);

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
  biteCreatorValue = resourceValue(this.biteCreator);

  saveNewReview(newReview: { review: string; biteId: string }): void {
    this.storeService.saveReview(newReview);
  }

  saveReviewReply(reply: {
    review: string;
    biteId: string;
    parentReviewId: string;
    threadId: string;
  }): void {
    this.storeService.saveReviewReply(reply);
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

  /**
   * Reports the Bite to the BiteTribe operators (GitHub issue #1608).
   *
   * Straight to the callable rather than through the store: nothing the app
   * holds changes when a report is filed, and the reporter sees no difference
   * in the Bite afterwards - the report only reaches an operator.
   */
  reportBite(
    biteId: string,
    reason: BiteReportReason,
  ): Promise<ReportBiteResult> {
    return this.api.reportBite(biteId, reason);
  }

  /**
   * The signed-in user's own Bites, read for the share image to tell which
   * first a Bite was (issue #1837). Straight from Firestore: the store holds
   * them only after My Bites or My Profile loaded them. Empty when signed out.
   */
  async ownBites(): Promise<Bite[]> {
    const uid = this.userId();

    return uid ? this.api.bitesByUser(uid) : [];
  }

  /**
   * Hands the Bite's link to the device share sheet, with its price and
   * rating as the message.
   *
   * The URL ends the text on every platform, so the message reads the same
   * wherever it lands. iOS and the web also take it as `url`, which the iOS
   * sheet turns into a link preview. Android does not: the Share plugin
   * appends an http(s) `url` to the text there, which sent the link twice
   * (#1775), and it builds no preview from it.
   */
  async shareBite(bite: Bite): Promise<void> {
    const url = sharedBiteUrl(bite.id);

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
      ...(Capacitor.getPlatform() === 'android' ? {} : { url }),
      dialogTitle: 'Share Bite',
    });
  }

  /**
   * Hands a composed share image to the device share sheet as a file
   * (`UC-SBS`). Only the re-encoded canvas output reaches this - never the
   * original upload, which may carry EXIF GPS data (`R-21`).
   *
   * A native build writes the image to the cache directory first, because the
   * Share plugin shares files by URI. A browser shares it through the Web
   * Share API, and throws {@link ShareImageUnavailableError} where that cannot
   * take files.
   */
  async shareBiteImage(bite: Bite, image: Blob): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ files: [await this.writeShareImage(bite, image)] });

      return;
    }

    const file = new File([image], shareImageFileName(bite), {
      type: image.type,
    });

    if (!navigator.canShare?.({ files: [file] })) {
      throw new ShareImageUnavailableError();
    }

    await navigator.share({ files: [file] });
  }

  /**
   * Whether this platform can hand an image file to a share sheet, which
   * decides whether Share image… is offered at all (`UC-SBS` `R-12`). A device
   * always can; a browser only where the Web Share API takes files.
   */
  canShareImageFiles(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    const probe = new File([], 'probe.jpg', { type: 'image/jpeg' });

    return !!navigator.canShare?.({ files: [probe] });
  }

  /**
   * Saves a composed share image (`UC-SBS` `R-12`, `R-27`): to the photo
   * library on a device, add-only on iOS, and as a download in a browser. Only
   * the re-encoded canvas output is saved (`R-21`).
   *
   * Throws {@link SaveImageDeniedError} when the user has refused to let the app
   * add the image.
   */
  async saveBiteImage(bite: Bite, image: Blob): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      downloadImage(image, shareImageFileName(bite));
      return;
    }

    try {
      await SaveImage.saveToPhotos({
        path: await this.writeShareImage(bite, image),
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'permission-denied') {
        throw new SaveImageDeniedError();
      }

      throw error;
    }
  }

  /**
   * Whether a share image can be handed to `target`'s app, which decides
   * whether the menu offers it (`UC-SBS` `R-12`). A browser can open no app,
   * and a check that fails reads as not installed, so the menu never offers an
   * app it cannot reach.
   */
  async canShareImageTo(target: SocialShareTarget): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { available } = await SocialShare.canShareTo({ target });

      return available;
    } catch (error) {
      console.warn(`Could not check the ${target} share target:`, error);

      return false;
    }
  }

  /**
   * Hands a composed share image straight to `target`'s app (`UC-SBS`
   * `R-25` to `R-27`, issue #1730): the Stories editor with the image as its
   * background, or Instagram's feed composer. Only the re-encoded canvas output
   * is handed over (`R-21`).
   *
   * Throws {@link ShareTargetUnavailableError} when the app is missing or would
   * not open, and {@link SaveImageDeniedError} when the iOS Instagram Post
   * hand-off was refused add access to the photo library.
   */
  async shareBiteImageTo(
    target: SocialShareTarget,
    bite: Bite,
    image: Blob,
  ): Promise<void> {
    const path = await this.writeShareImage(bite, image);

    try {
      await HAND_OFF[target]({ path });
    } catch (error) {
      const code = (error as { code?: string })?.code;

      if (code === SOCIAL_SHARE_PERMISSION_DENIED) {
        throw new SaveImageDeniedError();
      }

      if (code === SOCIAL_SHARE_UNAVAILABLE) {
        throw new ShareTargetUnavailableError();
      }

      throw error;
    }
  }

  /**
   * Writes the image to the cache directory, where the Share plugin, the save
   * plugin and the social share plugin read it from by URI.
   */
  private async writeShareImage(bite: Bite, image: Blob): Promise<string> {
    const { uri } = await Filesystem.writeFile({
      path: `share-image/${shareImageFileName(bite)}`,
      data: await toBase64(image),
      directory: Directory.Cache,
      recursive: true,
    });

    return uri;
  }
}
