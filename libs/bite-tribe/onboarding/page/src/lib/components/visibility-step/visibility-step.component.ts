import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Visibility onboarding step. Presents "stay private" (preselected) and "go
 * public" as two tappable cards and emits the user's choice.
 *
 * The options are native radio inputs wrapped in labels, so the whole card is
 * tappable and keyboard/screen-reader accessible without depending on Ionic's
 * shadow-DOM radio label rendering. Private is preselected, and the parent
 * treats that preselection as a real answer, so the step is presentational: it
 * only reports the changes the user makes (issue #1326).
 */
@Component({
  selector: 'onboarding-visibility-step',
  templateUrl: './visibility-step.component.html',
  styleUrl: './visibility-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
})
export class VisibilityStepComponent {
  selectedPublic = input<boolean | null>(false);
  visibilityChange = output<boolean>();

  /**
   * Local mirror of the selection so the highlight and checked state update the
   * instant the user clicks, without waiting for the choice to round-trip back
   * through the parent. It re-syncs whenever the `selectedPublic` input changes,
   * so external updates still win.
   */
  protected readonly isPublicSelected = linkedSignal(
    () => this.selectedPublic() === true,
  );

  selectVisibility(isPublic: boolean): void {
    this.isPublicSelected.set(isPublic);
    this.visibilityChange.emit(isPublic);
  }
}
