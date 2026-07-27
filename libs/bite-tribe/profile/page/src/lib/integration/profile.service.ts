import { computed, inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
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
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly emailVerification = inject(EmailVerificationService);
  private readonly toastController = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  isAuthenticated = this.dataAccess.isAuthenticated;
  myUser = this.dataAccess.myUser;
  user = this.dataAccess.user;
  userId = this.dataAccess.userId;
  bitesByUser = this.dataAccess.bitesByUser;
  biteTrailsByUser = this.dataAccess.biteTrailsByUser;
  myBites = this.dataAccess.myBites;
  myBiteTrails = this.dataAccess.myBiteTrails;
  isPublicProfile = this.dataAccess.isPublicProfile;
  profileMetadata = this.dataAccess.profileMetadata;
  emailVerificationPromptVisible = this.emailVerification.promptVisible;

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
}
