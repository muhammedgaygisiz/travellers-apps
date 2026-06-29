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
      [user]="service.user.value()"
      [bites]="service.bitesByUser()"
      [biteTrails]="service.biteTrailsByUser.value()"
      [userId]="service.userId()"
      [profileMetadata]="service.profileMetadata()"
      (biteClick)="service.biteClicked($event)"
      (logoutClick)="service.logout()"
      (gotoSettings)="service.gotoSettings()"
      (gotoMyBucketlists)="service.gotoMyBucketlists()"
      (gotoMyBites)="service.gotoMyBites()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (gotoMyProfile)="service.gotoMyProfileClicked()"
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
