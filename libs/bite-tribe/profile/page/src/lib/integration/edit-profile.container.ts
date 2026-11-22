import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EditProfilePage } from '../components/edit-profile-page/edit-profile.page';
import { CHOOSE_PHOTO_QUERY_PARAM, ProfileService } from './profile.service';
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
      [saving]="service.profileSaving()"
      [pendingFollowRequestCount]="service.pendingFollowRequestCount()"
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly page = viewChild(EditProfilePage);

  private hasTrackedPrompt = false;

  private readonly trackPromptEffect = effect(() => {
    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }
  });

  ionViewDidEnter(): void {
    // Counted again on entry, so the warning on the switch to public names
    // the requests pending now rather than when the own profile was last
    // opened (GitHub issue #2168).
    this.service.refreshPendingFollowRequests();

    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Edit Profile',
    });

    if (this.service.emailVerificationPromptVisible()) {
      this.trackPromptShownOnce();
    }

    this.openPhotoPickerWhenAsked();
  }

  /**
   * Arrived from a refused profile photo (GitHub issue #2140): the picker
   * opens at once. The parameter is dropped again, so going back and forth
   * does not reopen it.
   */
  private openPhotoPickerWhenAsked(): void {
    if (
      this.route.snapshot.queryParamMap.get(CHOOSE_PHOTO_QUERY_PARAM) !== 'true'
    ) {
      return;
    }

    this.page()?.openPhotoPicker();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [CHOOSE_PHOTO_QUERY_PARAM]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
