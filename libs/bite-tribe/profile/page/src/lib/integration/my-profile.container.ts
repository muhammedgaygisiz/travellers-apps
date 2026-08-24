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
      (likeButtonClick)="service.likeButtonClicked($event)"
      (followersClick)="service.gotoFollowers($event)"
      (followingClick)="service.gotoFollowing($event)"
    />
  `,
  imports: [ProfileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProfileContainer {
  service = inject(ProfileService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'My Profile',
    });
  }
}
