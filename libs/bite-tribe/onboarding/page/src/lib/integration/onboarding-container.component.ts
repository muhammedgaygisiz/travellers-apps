import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { OnboardingPage } from '../components/onboarding-page/onboarding.page';
import { OnboardingService } from './onboarding.service';

@Component({
  selector: 'onboarding-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<onboarding-page
    class="ion-page"
    (dismiss)="service.dismiss()"
  />`,
  imports: [OnboardingPage],
})
export class OnboardingContainerComponent {
  service = inject(OnboardingService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Onboarding',
    });
  }
}
