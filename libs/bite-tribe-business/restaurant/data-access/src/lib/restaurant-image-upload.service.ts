import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeApiService } from 'bite-tribe/api';
import type { CreateAndUploadImageCallbackParams, Restaurant } from 'model';

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

export type RestaurantImageStatus = 'pending' | 'uploaded' | 'failed';

interface UploadState {
  restaurantId: string;
  status: RestaurantImageStatus;
  /** The photo being sent, kept for a retry and for the blurred preview. */
  photo?: string;
  /** The landed photo's URL, shown before the store reads the restaurant again. */
  imagePath?: string;
}

/**
 * Uploads a restaurant photo chosen in the business app in the background,
 * the way a Bite photo and a profile photo are uploaded (GitHub issues #1953
 * and #2126).
 *
 * The restaurant is marked `pending` before the transfer starts and keeps
 * showing its previous photo. When the transfer finishes, the restaurant is
 * pointed at the new object - by this device for an immediate update, and by
 * the storage finalize trigger `setRestaurantImagePathOnUpload` in case this
 * device is gone by then. A transfer that errors or stalls is written off as
 * `failed`, which the edit page offers to retry.
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

    const startedAt = restaurant.imageUploadStartedAtTimestamp;

    if (typeof startedAt !== 'number') {
      return 'pending';
    }

    return now - startedAt >= STALE_PENDING_RESTAURANT_IMAGE_MS
      ? 'failed'
      : 'pending';
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
      void this.finish(restaurantId, p.imagePath);
    }
  }

  private async finish(
    restaurantId: string,
    storagePath: string,
  ): Promise<void> {
    if (!this.inFlight) {
      return;
    }

    this.end();

    try {
      const imagePath = await this.api.setUploadedRestaurantImage(
        restaurantId,
        storagePath,
      );
      this.state.set({ restaurantId, status: 'uploaded', imagePath });
    } catch (error) {
      // The object is in Storage, so the finalize trigger still points the
      // restaurant at it; only this device's immediate update is lost.
      console.warn('Could not point the restaurant at the new photo:', error);
      this.state.update((upload) => ({
        restaurantId,
        status: 'uploaded',
        imagePath: upload?.imagePath,
      }));
    }
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
    this.state.update((upload) =>
      upload ? { ...upload, status: 'failed' } : upload,
    );
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
