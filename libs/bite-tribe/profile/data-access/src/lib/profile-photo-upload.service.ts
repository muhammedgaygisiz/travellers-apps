import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type { CreateAndUploadImageCallbackParams, PublicUser } from 'model';

/**
 * How long a profile photo upload may go without reporting anything before it
 * counts as failed. The same window as a Bite photo upload, for the same
 * reason: offline, the Storage SDK retries silently for ten minutes and never
 * reaches its error branch (GitHub issue #1229).
 */
export const STALLED_PROFILE_PHOTO_UPLOAD_MS = 30 * 1000;

/**
 * Uploads a newly chosen profile photo in the background, the way a Bite photo
 * is uploaded (GitHub issue #1953).
 *
 * The profile document is marked `pending` before the transfer starts and
 * keeps showing the previous photo. When the transfer finishes, the document
 * is pointed at the new object - by this device for an immediate update, and
 * by the storage finalize trigger `setUserPhotoUrlOnUpload` in case this
 * device is gone by then. A transfer that errors or stalls is written off as
 * `failed`, which the own profile offers to retry.
 */
@Injectable({ providedIn: 'root' })
export class ProfilePhotoUploadService {
  private readonly api = inject(BiteTribeApiService);
  private readonly storeService = inject(BiteTribeStoreService);

  private readonly myUser = toSignal(this.storeService.publicUser$);

  /** One transfer at a time: a second would leave two objects to settle. */
  private inFlight = false;
  private stallTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * The photo waiting to land: the one sent from this session, or after a
   * reload the copy the upload left on this device. A retry sends it again,
   * and the own profile shows it blurred under the upload status (GitHub
   * issue #1953). `undefined` once it landed, or when this device has none.
   */
  readonly pendingPhoto = signal<string | undefined>(undefined);

  /** The account {@link pendingPhoto} belongs to. */
  private pendingPhotoOwner: string | undefined;

  /** The account whose device copy was already looked for. */
  private lookedUpLocalCopyFor: string | undefined;

  constructor() {
    effect(() => {
      const profile = this.myUser();

      // Another account signed in on this device: its photo is not this one.
      if (profile?.userId !== this.pendingPhotoOwner) {
        untracked(() => this.pendingPhoto.set(undefined));
      }

      const waiting =
        profile?.photoStatus === 'pending' || profile?.photoStatus === 'failed';

      if (
        profile &&
        waiting &&
        !this.pendingPhoto() &&
        this.lookedUpLocalCopyFor !== profile.userId
      ) {
        this.lookedUpLocalCopyFor = profile.userId;
        void this.loadLocalCopy(profile.userId);
      }
    });
  }

  private async loadLocalCopy(userId: string): Promise<void> {
    const photo = await this.api.findLocalProfilePhoto(userId);

    if (photo && !this.pendingPhoto() && this.myUser()?.userId === userId) {
      this.pendingPhotoOwner = userId;
      this.pendingPhoto.set(photo);
    }
  }

  /**
   * Starts the transfer for a profile whose document is already `pending`.
   * Started, not awaited: the outcome arrives through the store.
   */
  start(profile: PublicUser, photo: string): void {
    if (this.inFlight) {
      return;
    }

    this.inFlight = true;
    this.pendingPhotoOwner = profile.userId;
    this.pendingPhoto.set(photo);
    this.restartStallTimer(profile);

    this.api
      .uploadProfilePhoto(profile.userId, photo, (p) =>
        this.handleProgress(profile, p),
      )
      .catch(() => this.fail(profile));
  }

  /**
   * Sends the photo of a failed upload again. Answers `false` when there is
   * no photo left to send, so the caller can have the user choose one again.
   */
  async retry(): Promise<boolean> {
    const profile = this.myUser();

    if (!profile) {
      return true;
    }

    if (this.inFlight) {
      return true;
    }

    const photo =
      this.pendingPhoto() ??
      (await this.api.findLocalProfilePhoto(profile.userId));

    if (!photo) {
      return false;
    }

    const startedAt = Date.now();
    const pendingProfile: PublicUser = {
      ...profile,
      photoStatus: 'pending',
      photoUploadStartedAtTimestamp: startedAt,
    };

    // Started, not awaited: see `setProfilePhotoStatus` (GitHub issue #1390).
    void this.api.setProfilePhotoStatus(profile.userId, 'pending', startedAt);
    this.storeService.notifySavedProfile(pendingProfile);
    this.start(pendingProfile, photo);

    return true;
  }

  private handleProgress(
    profile: PublicUser,
    p: CreateAndUploadImageCallbackParams,
  ): void {
    if (p.uploadParams?.err) {
      this.fail(profile);
    } else if (p.uploadParams?.evt?.completed === false) {
      this.restartStallTimer(profile);
    } else if (p.uploadParams?.evt?.completed === true) {
      void this.finish(profile, p.imagePath);
    }
  }

  private async finish(profile: PublicUser, imagePath: string): Promise<void> {
    if (!this.inFlight) {
      return;
    }

    this.end();
    this.pendingPhoto.set(undefined);

    try {
      const photoUrl = await this.api.setUploadedProfilePhoto(
        profile.userId,
        imagePath,
      );

      this.storeService.notifySavedProfile({
        ...(this.myUser() ?? profile),
        photoUrl,
        photoStatus: 'uploaded',
      });
    } catch (error) {
      // The object is in Storage, so the finalize trigger still points the
      // document at it; only this device's immediate update is lost.
      console.warn('Could not point the profile at the new photo:', error);
    }
  }

  /**
   * Records the terminal `failed` state on the document and in the store.
   * Only a transfer still being tracked can fail, so a late error cannot write
   * off an upload that already finished.
   */
  private fail(profile: PublicUser): void {
    if (!this.inFlight) {
      return;
    }

    this.end();

    void this.api.setProfilePhotoStatus(profile.userId, 'failed');
    this.storeService.notifySavedProfile({
      ...(this.myUser() ?? profile),
      photoStatus: 'failed',
    });
  }

  private restartStallTimer(profile: PublicUser): void {
    this.clearStallTimer();
    this.stallTimer = setTimeout(
      () => this.fail(profile),
      STALLED_PROFILE_PHOTO_UPLOAD_MS,
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
