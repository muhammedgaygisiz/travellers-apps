import {
  computed,
  inject,
  Injectable,
  resource,
  ResourceLoader,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService, loadVisibleProfile } from 'bite-tribe/api';
import { ProfilePhotoUploadService } from './profile-photo-upload.service';
import type {
  Bite,
  LikeClick,
  PublicUser,
  ReportUserResult,
  UserReportReason,
} from 'model';
import { isBase64String, resourceValue } from 'utils';

interface ProfileResourceParams {
  userId: string | undefined;
}

@Injectable({ providedIn: 'root' })
export class ProfileDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);
  private readonly photoUpload = inject(ProfilePhotoUploadService);

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  bitesByUser = toSignal(this.storeService.bitesByUser$, {
    initialValue: [] as Bite[],
  });

  myUser = toSignal(this.storeService.publicUser$);

  myBites = toSignal(this.storeService.myProfileBites$, {
    initialValue: [] as Bite[],
  });

  private bites = toSignal(this.storeService.bites$, {
    initialValue: [] as Bite[],
  });

  userLoader: ResourceLoader<PublicUser | undefined, ProfileResourceParams> =
    async ({ params }) => {
      if (!params.userId) {
        return undefined;
      }

      // A private profile of another account is refused by the rules and
      // arrives as a stand-in holding its uid alone (issue #1863).
      return loadVisibleProfile(params.userId);
    };

  user = resource({
    params: () => ({
      userId: this.storeService.userIdFromUrl(),
    }),
    loader: this.userLoader.bind(this),
  });

  // Read guarded: `value()` throws once a read has failed, which would abort
  // the profile page's binding update rather than showing the loaded user.
  // See GitHub issue #1232.
  userValue = resourceValue(this.user);

  userId = toSignal(this.storeService.userId$, { initialValue: '' });

  isPublicProfile = toSignal(this.storeService.isPublicProfile$);

  profileMetadata = toSignal(this.storeService.profileMetadata$);

  private readonly blockedUserIds = toSignal(
    this.storeService.blockedUserIds$,
    { initialValue: [] as string[] },
  );

  /** Whether the signed-in user blocked the profile on screen (#1609). */
  isBlockedByMe = computed((): boolean => {
    const profileOwner = this.userValue()?.userId;

    return !!profileOwner && this.blockedUserIds().includes(profileOwner);
  });

  logout(): void {
    this.storeService.logout();
  }

  /**
   * Every Bite of a user, read once for the world page's per-country counts
   * (GitHub issue #1787). Not kept in the store: the profile's own list is
   * loaded by route there, and the world page only needs the counts.
   */
  loadBitesByUser(userId: string): Promise<Bite[]> {
    return this.api.bitesByUser(userId);
  }

  submitLikeClick(likeClick: LikeClick): void {
    this.storeService.submitLikeClick(likeClick);
  }

  /**
   * Writes the own profile and syncs the store. A failed write is thrown for
   * the page to report.
   *
   * A newly chosen photo is not part of the write: the document is marked as
   * waiting for it and keeps the current photo, and the photo uploads in the
   * background with its own status and retry, as a Bite photo does (GitHub
   * issue #1953).
   */
  async savePublicProfile(publicUser: PublicUser): Promise<void> {
    if (!isBase64String(publicUser.photoUrl)) {
      this.storeService.notifySavedProfile(
        await this.api.saveProfile(publicUser),
      );

      return;
    }

    const photo = publicUser.photoUrl;
    const saved = await this.api.saveProfile(
      { ...publicUser, photoUrl: this.myUser()?.photoUrl ?? '' },
      Date.now(),
    );

    this.storeService.notifySavedProfile(saved);
    this.photoUpload.start(saved, photo);
  }

  /** See {@link ProfilePhotoUploadService.pendingPhoto}. */
  readonly pendingProfilePhoto = this.photoUpload.pendingPhoto;

  /** See {@link ProfilePhotoUploadService.retry}. */
  retryProfilePhotoUpload(): Promise<boolean> {
    return this.photoUpload.retry();
  }

  claimDisplayName(
    displayName: string,
  ): Promise<{ displayName: string; normalizedDisplayName: string }> {
    return this.api.claimDisplayName(displayName);
  }

  submitFollowClick(user: PublicUser): void {
    this.storeService.followUser(user);
  }

  submitUnfollowClick(user: PublicUser): void {
    this.storeService.unfollowUser(user);
  }

  submitBlockClick(user: PublicUser): void {
    this.storeService.blockUser(user);
  }

  submitUnblockClick(user: PublicUser): void {
    this.storeService.unblockUser(user);
  }

  /**
   * Reports the profile to the BiteTribe operators (GitHub issue #1829).
   *
   * Straight to the API rather than through the store, as a Bite report is:
   * nothing the app holds changes, and the report only reaches an operator.
   */
  reportUser(
    userId: string,
    reason: UserReportReason,
  ): Promise<ReportUserResult> {
    return this.api.reportUser(userId, reason);
  }
}
