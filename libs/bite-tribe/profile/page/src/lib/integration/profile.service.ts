import { computed, inject, Injectable, signal } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LocalImagePickerService } from 'bite-tribe-common/bite';
import { NavController } from '@ionic/angular/standalone';
import type { PageMenuTarget } from 'common/ui/page';
import type { Bite, LikeClick, PublicUser, UserReportReason } from 'model';
import {
  PATH,
  getDisplayNameFailureReason,
  type DisplayNameFailureReason,
} from 'utils';
import { ToastService } from 'toast';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import {
  EmailVerificationService,
  type EmailVerificationSurface,
} from 'bite-tribe/email-verification-data-access';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { countBitesByCountry } from './utils/count-bites-by-country';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly dataAccess = inject(ProfileDataAccessService);
  private readonly biteDataAccess = inject(BiteDataAccessService);
  private readonly localImagePicker = inject(LocalImagePickerService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly emailVerification = inject(EmailVerificationService);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);

  isAuthenticated = this.dataAccess.isAuthenticated;
  myUser = this.dataAccess.myUser;
  user = this.dataAccess.user;

  /** Read guarded: `value()` throws once a read has failed (#1232). */
  userValue = this.dataAccess.userValue;
  userId = this.dataAccess.userId;
  /** The new own profile photo while it is still uploading (#1953). */
  pendingProfilePhoto = this.dataAccess.pendingProfilePhoto;
  bitesByUser = this.dataAccess.bitesByUser;
  myBites = this.dataAccess.myBites;
  isPublicProfile = this.dataAccess.isPublicProfile;
  profileMetadata = this.dataAccess.profileMetadata;
  isBlockedByMe = this.dataAccess.isBlockedByMe;
  emailVerificationPromptVisible = this.emailVerification.promptVisible;
  emailVerificationResendRunning = this.emailVerification.resendRunning;

  // The own profile comes from the store instead of a resource, so it has no
  // loading flag: an authenticated user without a profile yet is still loading.
  isMyProfileLoading = computed((): boolean => {
    return this.isAuthenticated() && !this.myUser();
  });

  /** True while an Edit Profile save is being written, photo upload included. */
  readonly profileSaving = signal(false);

  logout(): void {
    this.dataAccess.logout();
  }

  gotoSettings(): void {
    this.navController.navigateForward(['settings']);
  }

  gotoMyBucketlists(): void {
    this.navController.navigateForward(['my-bucketlists']);
  }

  gotoMyBites(): void {
    this.navController.navigateForward(['my-bites']);
  }

  gotoEditProfile(): void {
    this.navController.navigateForward([PATH.EDIT_PROFILE]);
  }

  gotoMyProfileClicked(): void {
    this.navController.navigateForward(['my-profile']);
  }

  onMenuNavigate(target: PageMenuTarget): void {
    switch (target) {
      case 'settings':
        this.gotoSettings();
        break;
      case 'profile':
        this.gotoMyProfileClicked();
        break;
      case 'my-bites':
        this.gotoMyBites();
        break;
      case 'my-bucketlists':
        this.gotoMyBucketlists();
        break;
    }
  }

  likeButtonClicked(likeClick: LikeClick): void {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }

  /**
   * Saves the Edit Profile form and goes back once the profile is written. A
   * new photo keeps uploading after that, with its status on the own profile.
   *
   * A failed write keeps the user on the form and says so (GitHub issue
   * #1953).
   */
  async saveProfile(publicUser: PublicUser): Promise<void> {
    if (this.profileSaving()) {
      return;
    }

    this.profileSaving.set(true);

    try {
      if (await this.writeProfile(publicUser)) {
        this.leaveEditProfile();
      }
    } finally {
      this.profileSaving.set(false);
    }
  }

  private async writeProfile(publicUser: PublicUser): Promise<boolean> {
    const previousDisplayName = this.myUser()?.displayName ?? '';
    const displayNameChanged =
      (publicUser.displayName ?? '').trim() !== previousDisplayName.trim();

    if (displayNameChanged) {
      try {
        await this.dataAccess.claimDisplayName(publicUser.displayName);
      } catch (error) {
        await this.toast.present({
          messageKey: this.getDisplayNameErrorKey(
            getDisplayNameFailureReason(error),
          ),
          outcome: 'failure',
        });

        return false;
      }
    }

    try {
      await this.dataAccess.savePublicProfile(publicUser);
    } catch (error) {
      console.error('Failed to save the profile:', error);

      await this.toast.present({
        messageKey: 'profile-could-not-be-saved',
        outcome: 'failure',
      });

      return false;
    }

    return true;
  }

  /**
   * Goes back to where Edit Profile was opened from, or to the own profile
   * when it was the first page of this app instance. Going back from there
   * would leave the app - after a reload, or from a link - and unload it with
   * the photo upload still running (GitHub issue #1953).
   */
  private leaveEditProfile(): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      void this.navController.navigateBack([PATH.MY_PROFILE]);
    }
  }

  /**
   * Sends a profile photo whose upload failed again, or has the user choose
   * it again when this device no longer holds it (GitHub issue #1953).
   */
  async retryProfilePhotoUpload(): Promise<void> {
    if (!(await this.dataAccess.retryProfilePhotoUpload())) {
      this.gotoEditProfile();
    }
  }

  private getDisplayNameErrorKey(reason: DisplayNameFailureReason): string {
    switch (reason) {
      case 'taken':
        return 'display-name-already-taken';
      case 'invalid':
        return 'display-name-invalid';
      default:
        return 'display-name-could-not-be-saved';
    }
  }

  /**
   * Counted on the tap, the same moment the button turns into Unfollow: the
   * profile follow is optimistic and its write reports no outcome to wait for
   * (GitHub issue #1708).
   */
  followButtonClicked(user: PublicUser): void {
    this.dataAccess.submitFollowClick(user);
    this.analytics.logEvent(AnalyticsEvent.UserFollowed, {
      source: 'profile',
    });
  }

  unfollowButtonClicked(user: PublicUser): void {
    this.dataAccess.submitUnfollowClick(user);
  }

  blockButtonClicked(user: PublicUser): void {
    this.dataAccess.submitBlockClick(user);
  }

  unblockButtonClicked(user: PublicUser): void {
    this.dataAccess.submitUnblockClick(user);
  }

  /**
   * Files the report and tells the reporter it was received (GitHub issue
   * #1829).
   *
   * The same three answers a Bite report gives: received, already received, or
   * not sent. A second report is refused by the backend and said so here, in
   * its own words, because the profile is already in front of an operator.
   */
  async reportUser(report: {
    user: PublicUser;
    reason: UserReportReason;
  }): Promise<void> {
    try {
      const { reported } = await this.dataAccess.reportUser(
        report.user.userId,
        report.reason,
      );

      await this.toast.present({
        messageKey: reported
          ? 'report-profile-sent'
          : 'report-profile-already-sent',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to report the profile:', error);

      await this.toast.present({
        messageKey: 'report-profile-failed',
        outcome: 'failure',
      });
    }
  }

  /** Opens the profile's countries on a globe (GitHub issue #1787). */
  gotoWorld(userId: string): void {
    this.navController.navigateForward([PATH.WORLD, userId]);
  }

  /** The user's Bites per country, for the world page's list (#1787). */
  async biteCountsByCountry(userId: string): Promise<Record<string, number>> {
    return countBitesByCountry(await this.dataAccess.loadBitesByUser(userId));
  }

  trackWorldOpened(ownProfile: boolean): void {
    this.analytics.logEvent(AnalyticsEvent.WorldGlobeOpened, {
      own_profile: ownProfile,
    });
  }

  trackWorldCountryTapped(
    countryCode: string,
    hasBites: boolean,
    source: 'globe' | 'list',
  ): void {
    this.analytics.logEvent(AnalyticsEvent.WorldGlobeCountryTapped, {
      country_code: countryCode,
      has_bites: hasBites,
      source,
    });
  }

  trackWorldZoomed(control: 'button' | 'gesture'): void {
    this.analytics.logEvent(AnalyticsEvent.WorldGlobeZoomed, { control });
  }

  gotoFollowers(userId: string): void {
    this.navController.navigateForward([PATH.FOLLOWERS, userId, 'followers']);
  }

  gotoFollowing(userId: string): void {
    this.navController.navigateForward([PATH.FOLLOWERS, userId, 'following']);
  }

  trackEmailVerificationPromptShown(surface: EmailVerificationSurface): void {
    this.emailVerification.trackPromptShown(surface);
  }

  resendEmailVerification(surface: EmailVerificationSurface): Promise<void> {
    return this.emailVerification.resend(surface);
  }

  /**
   * Re-sends a Bite photo whose upload never made it, in one of two flows
   * depending on whether this device still holds the Bite's own copy: a recent
   * Bite posted from here is re-sent straight away, while an older one — or one
   * posted from another device — asks the user to pick from the photos saved
   * locally, the same set the gallery shows. Picking nothing cancels.
   *
   * Presenting the picker is a workflow decision, so it lives here rather than
   * in the card that raised the request. See GitHub issue #1168.
   */
  async retryBiteImageUpload(bite: Bite): Promise<void> {
    const localCopy = await this.biteDataAccess.findLocalImageForBite(bite.id);
    const fileUri = localCopy?.uri ?? (await this.localImagePicker.pick())?.uri;

    if (fileUri) {
      await this.biteDataAccess.retryImageUpload(bite, fileUri);
    }
  }
}
