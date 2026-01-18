import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProfileService } from './profile.service';
import { ProfileComponent } from '../components/profile-page/profile.component';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <profile-page
      class="ion-page"
      [isAuthenticated]="service.isAuthenticated()"
      [user]="service.biteCreator()"
      [bites]="service.bitesByUser()"
      [userId]="service.userId()"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (logoutClick)="service.logout()"
      (gotoSettings)="service.gotoSettings()"
      (gotoMyBucketlists)="service.gotoMyBucketlists()"
      (gotoMyBites)="service.gotoMyBites()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (gotoMyProfile)="service.gotoMyProfileClicked()"
      (gotoEditProfile)="service.gotoEditProfile()"
      (followButtonClick)="service.followButtonClicked($event)"
    />
  `,
  imports: [ProfileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteCreatorProfileContainer {
  service = inject(ProfileService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'User Profile',
    });
  }
}
