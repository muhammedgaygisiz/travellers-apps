import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { IonCheckbox, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { OnboardingPage } from '../components/onboarding-page/onboarding.page';
import { OnboardingService } from './onboarding.service';

/**
 * Binds onboarding navigation state to the shell and routes its outputs back
 * into the service. The step body is a placeholder acknowledgment for now; the
 * concrete step content is projected here by follow-up issues (#1014, #1015,
 * #1016).
 */
@Component({
  selector: 'onboarding-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<onboarding-page
    class="ion-page"
    [steps]="service.steps"
    [currentIndex]="service.currentIndex()"
    [canAdvance]="service.canAdvance()"
    (next)="service.next()"
    (back)="service.back()"
  >
    <ion-text>
      <p>{{ 'onboarding-step-placeholder' | transloco }}</p>
    </ion-text>

    <ion-checkbox
      labelPlacement="end"
      data-testid="onboarding-acknowledge"
      [checked]="service.isCurrentStepValid()"
      (ionChange)="service.setCurrentStepValid($event.detail.checked)"
    >
      {{ 'onboarding-acknowledge' | transloco }}
    </ion-checkbox>
  </onboarding-page>`,
  imports: [OnboardingPage, IonText, IonCheckbox, TranslocoPipe],
})
export class OnboardingContainerComponent {
  service = inject(OnboardingService);

  async ionViewWillEnter(): Promise<void> {
    await this.service.initialize();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Onboarding',
    });
  }
}
