import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { DietaryLabelTally, DietaryVote } from 'model';

/**
 * What diners said about one dietary label (GitHub issue #2197): how many
 * confirm it, how many dispute it, and the reader's own vote. A label nobody
 * voted on renders nothing, so a row without votes looks as it did.
 */
@Component({
  selector: 'bt-dietary-label-votes',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirmed()) {
      <span class="votes votes-confirmed" data-testid="dietary-votes-confirmed">
        {{ 'dietary-votes-confirmed' | transloco: { count: confirmed() } }}
      </span>
    }
    @if (disputed()) {
      <span class="votes votes-disputed" data-testid="dietary-votes-disputed">
        {{ 'dietary-votes-disputed' | transloco: { count: disputed() } }}
      </span>
    }
    @if (ownVote(); as vote) {
      <span class="votes votes-own" data-testid="dietary-votes-own">
        {{ 'dietary-vote-own-' + vote | transloco }}
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      font-size: 0.75rem;
      color: var(--ion-color-medium);
    }

    :host:empty {
      display: none;
    }

    .votes-disputed {
      color: var(--ion-color-danger);
    }
  `,
})
export class DietaryLabelVotesComponent {
  tally = input<DietaryLabelTally | undefined>();

  ownVote = input<DietaryVote | undefined>();

  protected readonly confirmed = computed(() => this.tally()?.confirm ?? 0);

  protected readonly disputed = computed(() => this.tally()?.dispute ?? 0);
}
