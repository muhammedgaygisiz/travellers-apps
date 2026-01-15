import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditProfilePage } from '../components/edit-profile-page/edit-profile.page';
import { ProfileService } from './profile.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EditProfilePage],
  template: `
    <edit-profile-page
      class="ion-page"
      [isAuthenticated]="service.isAuthenticated()"
      [isPublicProfile]="service.isPublicProfile()"
      [publicUser]="service.myUser()"
      (submitPublicUser)="service.saveProfile($event)"
      (goPublic)="service.goPublic()"
      (goPrivate)="service.goPrivate()"
    />
  `,
})
export class EditProfileContainer {
  service = inject(ProfileService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Edit Profile',
    });
  }
}
