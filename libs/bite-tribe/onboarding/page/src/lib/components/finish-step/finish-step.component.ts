import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Final onboarding step. It confirms the user is set up and previews what the
 * app opens onto next.
 *
 * The step gathers nothing and is always ready to complete: the assistant marks
 * it valid the moment it is reached, and the shell's Finish button writes the
 * durable completion flag and enters the app (epic #850, issue #1016). An
 * optional display name personalises the greeting when one is available.
 */
@Component({
  selector: 'onboarding-finish-step',
  templateUrl: './finish-step.component.html',
  styleUrl: './finish-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslocoPipe],
})
export class FinishStepComponent {
  displayName = input<string>('');
}
