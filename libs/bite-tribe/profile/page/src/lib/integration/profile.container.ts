import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProfileService } from './profile.service';
import { ProfileComponent } from '../components/profile-page/profile.component';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <profile-page
      class="ion-page"
      [isAuthenticated]="service.isAuthenticated()"
      [biteCreator]="service.biteCreator()"
      [bites]="service.bitesByUser()"
      [userId]="service.userId()"
      (logoutClick)="service.logout()"
      (gotoSettings)="service.gotoSettings()"
      (gotoMyBucketlists)="service.gotoMyBucketlists()"
      (gotoMyBites)="service.gotoMyBites()"
      (likeButtonClick)="service.likeButtonClicked($event)"
    />
  `,
  imports: [ProfileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class ProfileContainer {
  service = inject(ProfileService);

  ionViewDidEnter() {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'My Profile',
    });
  }
}
