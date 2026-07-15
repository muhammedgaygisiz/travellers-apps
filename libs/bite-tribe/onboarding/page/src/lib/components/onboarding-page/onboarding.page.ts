import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCheckbox,
  IonProgressBar,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { OnboardingStepDefinition } from '../../steps/onboarding-steps';
import { IdentityStepComponent } from '../identity-step/identity-step.component';
import type {
  DisplayNameAvailabilityState,
  OnboardingIdentityDraft,
} from '../identity-step/identity-step.component';
import { VisibilityStepComponent } from '../visibility-step/visibility-step.component';
import type { PublicUser } from 'model';

/**
 * Presentational onboarding assistant page. It owns the visible step layout and
 * chrome; the container only binds service state and forwards user events.
 */
@Component({
  selector: 'onboarding-page',
  templateUrl: 'onboarding.page.html',
  styleUrl: 'onboarding.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonButton,
    IonCheckbox,
    IonProgressBar,
    TranslocoPipe,
    IonText,
    IdentityStepComponent,
    VisibilityStepComponent,
  ],
})
export class OnboardingPage {
  steps = input.required<readonly OnboardingStepDefinition[]>();
  currentIndex = input.required<number>();
  canAdvance = input<boolean>(false);
  isCurrentStepValid = input<boolean>(false);
  profile = input<PublicUser | undefined>();
  displayNameAvailability = input<DisplayNameAvailabilityState>('idle');
  selectedVisibility = input<boolean | null>(false);

  next = output<void>();
  back = output<void>();
  identityChange = output<OnboardingIdentityDraft>();
  checkDisplayName = output<string>();
  visibilityChange = output<boolean>();
  placeholderValidityChange = output<boolean>();

  readonly stepCount = computed(() => this.steps().length);
  readonly stepNumber = computed(() => this.currentIndex() + 1);
  readonly currentStep = computed(() => this.steps()[this.currentIndex()]);
  readonly isFirstStep = computed(() => this.currentIndex() === 0);
  readonly isLastStep = computed(
    () => this.currentIndex() === this.stepCount() - 1,
  );
  readonly progress = computed(() =>
    this.stepCount() === 0 ? 0 : this.stepNumber() / this.stepCount(),
  );
}
