import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditProfilePage } from '../components/edit-profile-page/edit-profile.page';
import { ProfileService } from './profile.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'edit-profile-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EditProfilePage],
  template: `
    <edit-profile-page
      class="ion-page"
      [isAuthenticated]="service.isAuthenticated()"
      [publicUser]="service.myUser()"
      (submitPublicUser)="service.saveProfile($event)"
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
