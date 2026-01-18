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
      [user]="service.myUser()"
      [bites]="service.myBites()"
      [followerCount]="service.followerCount()"
      [followingCount]="service.followingCount()"
      [userId]="service.userId()"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (logoutClick)="service.logout()"
      (gotoSettings)="service.gotoSettings()"
      (gotoMyBucketlists)="service.gotoMyBucketlists()"
      (gotoMyBites)="service.gotoMyBites()"
      (gotoEditProfile)="service.gotoEditProfile()"
      (likeButtonClick)="service.likeButtonClicked($event)"
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
