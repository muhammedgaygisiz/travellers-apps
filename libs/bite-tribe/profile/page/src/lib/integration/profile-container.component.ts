import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProfileService } from './profile.service';
import { ProfileComponent } from '../components/profile-page/profile.component';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'profile-container',
  template: `
    <profile-page
      class="ion-page"
      [isAuthenticated]="service.isAuthenticated()"
      [isLoading]="service.user.isLoading()"
      [user]="service.userValue()"
      [bites]="service.bitesByUser()"
      [biteTrails]="service.biteTrailsByUserValue()"
      [userId]="service.userId()"
      [profileMetadata]="service.profileMetadata()"
      (biteClick)="service.biteClicked($event)"
      enableImageRetry
      (retryImageUpload)="service.retryBiteImageUpload($event)"
      (logoutClick)="service.logout()"
      (menuNavigate)="service.onMenuNavigate($event)"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (gotoEditProfile)="service.gotoEditProfile()"
      (followButtonClick)="service.followButtonClicked($event)"
      (unfollowButtonClick)="service.unfollowButtonClicked($event)"
      (followersClick)="service.gotoFollowers($event)"
      (followingClick)="service.gotoFollowing($event)"
    />
  `,
  imports: [ProfileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileContainer {
  service = inject(ProfileService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'User Profile',
    });
  }
}
