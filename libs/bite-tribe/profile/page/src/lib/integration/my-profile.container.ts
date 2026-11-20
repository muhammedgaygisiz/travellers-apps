import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProfileService } from './profile.service';
import { ProfileComponent } from '../components/profile-page/profile.component';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'my-profile-container',
  template: `
    <profile-page
      class="ion-page"
      [isAuthenticated]="service.isAuthenticated()"
      [isLoading]="service.isMyProfileLoading()"
      [user]="service.myUser()"
      [bites]="service.myBites()"
      [profileMetadata]="service.profileMetadata()"
      [userId]="service.userId()"
      (biteClick)="service.biteClicked($event)"
      enableImageRetry
      (retryImageUpload)="service.retryBiteImageUpload($event)"
      (logoutClick)="service.logout()"
      (menuNavigate)="service.onMenuNavigate($event)"
      (gotoEditProfile)="service.gotoEditProfile()"
      [pendingPhoto]="service.pendingProfilePhoto()"
      (retryPhotoUpload)="service.retryProfilePhotoUpload()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (followersClick)="service.gotoFollowers($event)"
      (followingClick)="service.gotoFollowing($event)"
      [followRequestCount]="service.pendingFollowRequestCount()"
      (followRequestsClick)="service.gotoFollowRequests()"
      (worldClick)="service.gotoWorld($event)"
      (weeklyBadgeClick)="service.gotoWeeklyStandings($event)"
    />
  `,
  imports: [ProfileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProfileContainer {
  service = inject(ProfileService);

  /**
   * Counts the pending follow requests on every entry, so coming back from
   * the requests page drops the row once they are all answered (#2165).
   */
  ionViewWillEnter(): void {
    this.service.refreshPendingFollowRequests();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'My Profile',
    });
  }
}
