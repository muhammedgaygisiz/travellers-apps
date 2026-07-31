import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
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
      [showEmailVerificationPrompt]="service.emailVerificationPromptVisible()"
      [emailVerificationResendRunning]="
        service.emailVerificationResendRunning()
      "
      (submitPublicUser)="service.saveProfile($event)"
      (resendEmailVerification)="
        service.resendEmailVerification('profile_edit')
      "
    />
  `,
})
export class EditProfileContainer {
  service = inject(ProfileService);

  private hasTrackedPrompt = false;

  private readonly trackPromptEffect = effect(() => {
    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }
  });

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Edit Profile',
    });

    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }
  }

  ionViewDidLeave(): void {
    this.hasTrackedPrompt = false;
  }

  private trackPromptShownOnce(): void {
    if (this.hasTrackedPrompt) {
      return;
    }

    this.hasTrackedPrompt = true;
    this.service.trackEmailVerificationPromptShown('profile_edit');
  }
}
