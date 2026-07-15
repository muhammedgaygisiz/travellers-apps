import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Visibility onboarding step. Presents "stay private" (preselected) and "go
 * public" as two tappable cards and emits the user's choice.
 *
 * The options are native radio inputs wrapped in labels, so the whole card is
 * tappable and keyboard/screen-reader accessible without depending on Ionic's
 * shadow-DOM radio label rendering. Private is preselected but the parent still
 * requires an explicit selection: tapping the already-selected option fires no
 * `change`, so selection is emitted on `click` too — otherwise a user keeping
 * the default (private) could never satisfy the gate.
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

  selectVisibility(isPublic: boolean): void {
    this.visibilityChange.emit(isPublic);
  }
}
