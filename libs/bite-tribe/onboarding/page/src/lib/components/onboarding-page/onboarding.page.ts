import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonProgressBar } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { OnboardingStepDefinition } from '../../steps/onboarding-steps';

/**
 * Presentational shell for the onboarding assistant. It renders the ordered
 * steps' chrome - progress indicator, current step title, and back/next
 * navigation - and projects the active step's content. Advancing is disabled
 * while the current step is invalid, and back is hidden on the first step so
 * there is no way out before the final step.
 */
@Component({
  selector: 'onboarding-page',
  templateUrl: 'onboarding.page.html',
  styleUrl: 'onboarding.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonButton, IonProgressBar, TranslocoPipe],
})
export class OnboardingPage {
  steps = input.required<readonly OnboardingStepDefinition[]>();
  currentIndex = input.required<number>();
  canAdvance = input<boolean>(false);

  next = output<void>();
  back = output<void>();

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
