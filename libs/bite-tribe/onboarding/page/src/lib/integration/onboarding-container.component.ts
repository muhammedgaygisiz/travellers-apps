import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { OnboardingPage } from '../components/onboarding-page/onboarding.page';
import { OnboardingService } from './onboarding.service';

/**
 * Binds onboarding service state to the presentational page and routes page
 * events back into the service.
 */
@Component({
  selector: 'onboarding-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<onboarding-page
    class="ion-page"
    [steps]="service.steps"
    [currentIndex]="service.currentIndex()"
    [canAdvance]="service.canAdvance()"
    [isCurrentStepValid]="service.isCurrentStepValid()"
    [profile]="service.profile()"
    [displayNameAvailability]="service.displayNameAvailability()"
    [selectedVisibility]="service.selectedVisibility()"
    (next)="service.next()"
    (back)="service.back()"
    (identityChange)="service.updateIdentity($event)"
    (checkDisplayName)="service.checkDisplayNameAvailability($event)"
    (visibilityChange)="service.updateVisibility($event)"
    (placeholderValidityChange)="service.setCurrentStepValid($event)"
  />`,
  imports: [OnboardingPage],
})
export class OnboardingContainerComponent {
  service = inject(OnboardingService);

  async ionViewWillEnter(): Promise<void> {
    await this.service.initialize();
  }

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Onboarding',
    });
  }
}
