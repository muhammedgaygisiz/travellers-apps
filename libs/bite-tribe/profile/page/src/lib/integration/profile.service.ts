import { computed, inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LocalImagePickerService } from 'bite-tribe-common/bite';
import { NavController } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import type { PageMenuTarget } from 'common/ui/page';
import type { Bite, LikeClick, PublicUser } from 'model';
import {
  PATH,
  getDisplayNameFailureReason,
  type DisplayNameFailureReason,
} from 'utils';
import { Location } from '@angular/common';
import {
  EmailVerificationService,
  type EmailVerificationSurface,
} from 'bite-tribe/email-verification-data-access';

const TOAST_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly dataAccess = inject(ProfileDataAccessService);
  private readonly biteDataAccess = inject(BiteDataAccessService);
  private readonly localImagePicker = inject(LocalImagePickerService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly emailVerification = inject(EmailVerificationService);
  private readonly toastController = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  isAuthenticated = this.dataAccess.isAuthenticated;
  myUser = this.dataAccess.myUser;
  user = this.dataAccess.user;

  /** Read guarded: `value()` throws once a read has failed (#1232). */
  userValue = this.dataAccess.userValue;
  userId = this.dataAccess.userId;
  bitesByUser = this.dataAccess.bitesByUser;
  biteTrailsByUser = this.dataAccess.biteTrailsByUser;
  biteTrailsByUserValue = this.dataAccess.biteTrailsByUserValue;
  myBites = this.dataAccess.myBites;
  myBiteTrails = this.dataAccess.myBiteTrails;
  myBiteTrailsValue = this.dataAccess.myBiteTrailsValue;
  isPublicProfile = this.dataAccess.isPublicProfile;
  profileMetadata = this.dataAccess.profileMetadata;
  emailVerificationPromptVisible = this.emailVerification.promptVisible;
  emailVerificationResendRunning = this.emailVerification.resendRunning;

  // The own profile comes from the store instead of a resource, so it has no
  // loading flag: an authenticated user without a profile yet is still loading.
  isMyProfileLoading = computed((): boolean => {
    return this.isAuthenticated() && !this.myUser();
  });

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

  async saveProfile(publicUser: PublicUser): Promise<void> {
    const previousDisplayName = this.myUser()?.displayName ?? '';
    const displayNameChanged =
      (publicUser.displayName ?? '').trim() !== previousDisplayName.trim();

    if (displayNameChanged) {
      try {
        await this.dataAccess.claimDisplayName(publicUser.displayName);
      } catch (error) {
        await this.showToast(
          this.getDisplayNameErrorKey(getDisplayNameFailureReason(error)),
        );

        return;
      }
    }

    this.dataAccess.savePublicProfile(publicUser);

    this.location.back();
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

  private async showToast(messageKey: string): Promise<void> {
    const toast = await this.toastController.create({
      message: this.transloco.translate(messageKey),
      position: 'bottom',
      duration: TOAST_DURATION_MS,
      buttons: [
        {
          text: this.transloco.translate('ok'),
          role: 'confirm',
        },
      ],
    });

    await toast.present();
  }

  followButtonClicked(user: PublicUser): void {
    this.dataAccess.submitFollowClick(user);
  }

  unfollowButtonClicked(user: PublicUser): void {
    this.dataAccess.submitUnfollowClick(user);
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
