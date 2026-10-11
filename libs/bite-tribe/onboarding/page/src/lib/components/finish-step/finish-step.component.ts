import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FollowSuggestionsComponent } from 'bite-tribe/follow-suggestions-ui';
import type { FollowSuggestion } from 'model';

/**
 * Final onboarding step. It confirms the user is set up and previews what the
 * app opens onto next.
 *
 * The step gathers nothing and is always ready to complete: the assistant marks
 * it valid the moment it is reached, and the shell's Finish button writes the
 * durable completion flag and enters the app (epic #850, issue #1016). An
 * optional display name personalises the greeting when one is available.
 *
 * It also offers a few people to follow (issue #1708). That stays optional:
 * following nobody, or the suggestions never arriving, leaves Finish exactly
 * as ready as before, because the step is the one a user can always leave.
 */
@Component({
  selector: 'onboarding-finish-step',
  templateUrl: './finish-step.component.html',
  styleUrl: './finish-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslocoPipe, FollowSuggestionsComponent],
})
export class FinishStepComponent {
  displayName = input<string>('');
  followSuggestions = input<FollowSuggestion[]>([]);
  followSuggestionsPending = input<ReadonlySet<string>>(new Set());
  followSuggestionsLoading = input(false);

  followSuggestion = output<FollowSuggestion>();
  followSuggestionsShown = output<number>();
}
