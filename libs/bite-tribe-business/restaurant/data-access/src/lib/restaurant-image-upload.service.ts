import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeApiService } from 'bite-tribe/api';
import type {
  CreateAndUploadImageCallbackParams,
  FolderPhotoVerdict,
  Restaurant,
} from 'model';
import type { Subscription } from 'rxjs';

/**
 * How long a restaurant photo upload may go without reporting anything before
 * it counts as failed. The same window as a Bite or profile photo upload, for
 * the same reason: offline, the Storage SDK retries silently for ten minutes
 * and never reaches its error branch (GitHub issue #1229).
 */
export const STALLED_RESTAURANT_IMAGE_UPLOAD_MS = 30 * 1000;

/**
 * A `pending` status older than this, with no upload of this session behind
 * it, was abandoned: the device that started it is gone. The same window a
 * Bite photo and a profile photo use (`STALE_PENDING_UPLOAD_MS`).
 */
export const STALE_PENDING_RESTAURANT_IMAGE_MS = 10 * 60 * 1000;

export type RestaurantImageStatus =
  'pending' | 'uploaded' | 'failed' | 'refused';

interface UploadState {
  restaurantId: string;
  status: RestaurantImageStatus;
  /** The photo being sent, kept for a retry and for the blurred preview. */
  photo?: string;
  /** The published photo's URL, shown before the store reads the restaurant again. */
  imagePath?: string;
  /**
   * The transfer is done and the image check has not answered yet (GitHub
   * issue #2141): the page says the photo is being checked, not uploaded.
   */
  checking?: boolean;
  /** Why the image check refused the photo, while `status` is `refused`. */
  refusalCategory?: string;
}

/**
 * Uploads a restaurant photo chosen in the business app in the background,
 * the way a Bite photo and a profile photo are uploaded (GitHub issues #1953
 * and #2126).
 *
 * The restaurant is marked `pending` before the transfer starts and keeps
 * showing its previous photo. When the transfer finishes, the storage finalize
 * trigger `setRestaurantImagePathOnUpload` runs the image check, and alone
 * publishes the photo or marks it `refused` (GitHub issue #2141): this device
 * writes neither, so nothing is published unchecked, and learns the verdict
 * by listening to the restaurant. A transfer that errors or stalls is written
 * off as `failed`, which the edit page offers to retry; a refused photo is
 * never sent again.
 *
 * Unlike the profile photo there is no on-device copy to retry from after a
 * reload: the business app runs on the web only, so a failed upload from an
 * earlier session asks for the photo again.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantImageUploadService {
  private readonly api = inject(BiteTribeApiService);

  private readonly state = signal<UploadState | undefined>(undefined);

  /** One transfer at a time: a second would leave two objects to settle. */
  private inFlight = false;
  private stallTimer: ReturnType<typeof setTimeout> | undefined;
  /** The listener waiting for the image check's verdict on this upload. */
  private verdictWatch: Subscription | undefined;

  /** This session's upload, if there is one. */
  readonly upload = this.state.asReadonly();

  /** Whether this session holds a photo a retry could send again. */
  readonly canRetry = computed(() => !!this.state()?.photo);

  /**
   * The status to render for a restaurant: this session's upload when it is
   * for that restaurant, otherwise the stored one, where a `pending` too old
   * to still be running reads as `failed`. Without a start time a `pending`
   * stays `pending`, because claiming failure for a photo that may still
   * arrive is worse than waiting - the profile photo's rule.
   */
  statusFor(
    restaurant: Restaurant | undefined,
    now: number = Date.now(),
  ): RestaurantImageStatus | undefined {
    const upload = this.state();

    if (restaurant && upload?.restaurantId === restaurant.id) {
      return upload.status;
    }

    if (restaurant?.imageStatus !== 'pending') {
      return restaurant?.imageStatus;
    }

    // The backend checks a photo again while its check could not run, and
    // writes `failed` itself after the last attempt (GitHub issue #2142).
    if (typeof restaurant.imageCheckNextAt === 'number') {
      return 'pending';
    }

    const startedAt = restaurant.imageUploadStartedAtTimestamp;

    if (typeof startedAt !== 'number') {
      return 'pending';
    }

    return now - startedAt >= STALE_PENDING_RESTAURANT_IMAGE_MS
      ? 'failed'
      : 'pending';
  }

  /**
   * Why the image check refused the restaurant's latest photo: this session's
   * verdict when it is for that restaurant, otherwise the stored one.
   */
  refusalCategoryFor(restaurant: Restaurant | undefined): string | undefined {
    const upload = this.state();

    if (restaurant && upload?.restaurantId === restaurant.id) {
      return upload.refusalCategory;
    }

    return restaurant?.imageStatus === 'refused'
      ? restaurant.imageRefusalCategory
      : undefined;
  }

  /**
   * Marks the restaurant `pending` and starts the transfer. Started, not
   * awaited: the outcome arrives through {@link upload}.
   */
  start(restaurantId: string, photo: string): void {
    if (this.inFlight) {
      return;
    }

    const startedAt = Date.now();

    this.inFlight = true;
    // Keeps a photo that already landed this session, so a failed second
    // upload falls back to it rather than to the one the store read earlier.
    const landed = this.state();
    this.state.set({
      restaurantId,
      status: 'pending',
      photo,
      ...(landed?.restaurantId === restaurantId && landed.imagePath
        ? { imagePath: landed.imagePath }
        : {}),
    });
    this.restartStallTimer(restaurantId);
    this.watchVerdict(restaurantId);

    // Not awaited: see `setProfilePhotoStatus` (GitHub issue #1390).
    this.api
      .setRestaurantImageStatus(restaurantId, 'pending', startedAt)
      .catch(() => undefined);

    this.api
      .uploadRestaurantImage(restaurantId, photo, (p) =>
        this.handleProgress(restaurantId, p),
      )
      .catch(() => this.fail(restaurantId));
  }

  /**
   * Sends the photo of a failed upload again. Answers `false` when this
   * session holds no photo to send, so the page can ask for one.
   */
  retry(): boolean {
    const upload = this.state();

    if (this.inFlight) {
      return true;
    }

    if (!upload?.photo) {
      return false;
    }

    this.start(upload.restaurantId, upload.photo);

    return true;
  }

  private handleProgress(
    restaurantId: string,
    p: CreateAndUploadImageCallbackParams,
  ): void {
    if (p.uploadParams?.err) {
      this.fail(restaurantId);
    } else if (p.uploadParams?.evt?.completed === false) {
      this.restartStallTimer(restaurantId);
    } else if (p.uploadParams?.evt?.completed === true) {
      this.finish();
    }
  }

  /**
   * The transfer is done. The restaurant stays `pending`, with the new photo
   * kept for the blurred preview, until the image check's verdict arrives.
   */
  private finish(): void {
    if (!this.inFlight) {
      return;
    }

    this.end();
    this.updateUpload((upload) => ({ ...upload, checking: true }));
  }

  /**
   * Listens for the verdict on this upload only: one that follows the
   * `pending` this upload wrote, so the previous photo's does not count.
   */
  private watchVerdict(restaurantId: string): void {
    this.stopWatchingVerdict();
    this.verdictWatch = this.api
      .restaurantPhotoVerdict$(restaurantId, true)
      .subscribe((verdict) => this.settle(restaurantId, verdict));
  }

  private stopWatchingVerdict(): void {
    this.verdictWatch?.unsubscribe();
    this.verdictWatch = undefined;
  }

  /**
   * Changes this session's upload. `start()` sets it before the transfer and
   * the verdict listener begin, so every callback that ends an upload finds
   * it, and nothing ever clears it.
   */
  private updateUpload(change: (upload: UploadState) => UploadState): void {
    this.state.update((upload) => change(upload as UploadState));
  }

  private settle(restaurantId: string, verdict: FolderPhotoVerdict): void {
    this.end();
    this.stopWatchingVerdict();

    if (verdict.imageStatus === 'uploaded') {
      this.state.set({
        restaurantId,
        status: 'uploaded',
        imagePath: verdict.imagePath,
      });

      return;
    }

    // Keeps a photo published earlier this session; the refused one is
    // dropped, so it can be neither shown nor sent again.
    this.updateUpload((upload) => ({
      restaurantId,
      status: 'refused',
      imagePath: upload.imagePath,
      refusalCategory: verdict.imageRefusalCategory,
    }));
  }

  /**
   * Records the terminal `failed` state. Only a transfer still being tracked
   * can fail, so a late error cannot write off an upload that already
   * finished.
   */
  private fail(restaurantId: string): void {
    if (!this.inFlight) {
      return;
    }

    this.end();
    this.stopWatchingVerdict();
    this.updateUpload((upload) => ({
      ...upload,
      status: 'failed',
      checking: false,
    }));
    this.api
      .setRestaurantImageStatus(restaurantId, 'failed')
      .catch(() => undefined);
  }

  private restartStallTimer(restaurantId: string): void {
    this.clearStallTimer();
    this.stallTimer = setTimeout(
      () => this.fail(restaurantId),
      STALLED_RESTAURANT_IMAGE_UPLOAD_MS,
    );
  }

  private clearStallTimer(): void {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = undefined;
    }
  }

  private end(): void {
    this.clearStallTimer();
    this.inFlight = false;
  }
}
