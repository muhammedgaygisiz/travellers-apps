import { inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { PageMenuTarget } from 'common/ui/page';
import type { Bite, LikeClick, PublicUser } from 'model';
import {
  getEmailVerificationFailureReason,
  PATH,
  type EmailVerificationFailureReason,
} from 'utils';
import { Location } from '@angular/common';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';

type EmailVerificationSurface = 'home' | 'settings' | 'profile_edit';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly dataAccess = inject(ProfileDataAccessService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly analytics = inject(AnalyticsService);
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
  emailVerificationPromptVisible =
    this.dataAccess.emailVerificationPromptVisible;

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

  saveProfile(publicUser: PublicUser): void {
    this.dataAccess.savePublicProfile(publicUser);

    this.location.back();
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
    if (!this.emailVerificationPromptVisible()) {
      return;
    }

    this.analytics.logEvent(AnalyticsEvent.EmailVerificationPromptShown, {
      surface,
    });
  }

  async resendEmailVerification(
    surface: EmailVerificationSurface,
  ): Promise<void> {
    this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendTapped, {
      surface,
    });

    try {
      await this.dataAccess.resendEmailVerification();
      this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendSucceeded, {
        surface,
      });
      await this.showEmailVerificationToast(
        'verification-email-sent-check-your-inbox',
      );
    } catch (error) {
      const reason = getEmailVerificationFailureReason(error);
      this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendFailed, {
        surface,
        reason,
      });
      await this.showEmailVerificationToast(this.getResendErrorKey(reason));
    }
  }

  private getResendErrorKey(reason: EmailVerificationFailureReason): string {
    if (reason === 'rate_limited') {
      return 'please-wait-before-requesting-another-verification-email';
    }

    return 'verification-email-could-not-be-sent';
  }

  private async showEmailVerificationToast(messageKey: string): Promise<void> {
    const toast = await this.toastController.create({
      message: this.transloco.translate(messageKey),
      position: 'bottom',
      duration: 5000,
      buttons: [
        {
          text: this.transloco.translate('ok'),
          role: 'confirm',
        },
      ],
    });

    await toast.present();
  }
}
