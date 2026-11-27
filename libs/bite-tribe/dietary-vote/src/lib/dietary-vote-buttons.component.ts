import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { thumbsDownOutline, thumbsUpOutline } from 'ionicons/icons';
import type { DietaryLabel, DietaryLabelTally, DietaryVote } from 'model';

/**
 * Confirm and dispute for one dietary label on the Bite details page
 * (GitHub issue #2197): a thumb up and a thumb down, each with its count, on
 * the label's own row so a count can never wrap beside another label. The
 * reader's own vote is the pressed one.
 *
 * A viewer offered a vote taps either to cast it; for everybody else the two
 * are plain counts, and a label nobody voted on then shows nothing.
 */
@Component({
  selector: 'bt-dietary-vote-buttons',
  imports: [IonIcon, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (canVote()) {
      @for (vote of votes; track vote) {
        <button
          type="button"
          class="vote"
          [class.vote-own]="ownVote() === vote"
          [class.vote-dispute]="vote === 'dispute'"
          [attr.aria-pressed]="ownVote() === vote"
          [attr.aria-label]="
            'dietary-vote-' + vote + '-on'
              | transloco
                : {
                    label: ('dietary-label-' + label() | transloco),
                    count: countOf(vote),
                  }
          "
          [attr.data-testid]="'dietary-vote-' + vote"
          (click)="voteClick.emit(vote)"
        >
          <ion-icon [name]="iconOf(vote)" aria-hidden="true" />
          {{ countOf(vote) }}
        </button>
      }
    } @else if (hasVotes()) {
      @for (vote of votes; track vote) {
        <span
          class="vote"
          [class.vote-dispute]="vote === 'dispute'"
          [attr.aria-label]="
            countKeyOf(vote) | transloco: { count: countOf(vote) }
          "
          [attr.data-testid]="'dietary-vote-' + vote"
        >
          <ion-icon [name]="iconOf(vote)" aria-hidden="true" />
          {{ countOf(vote) }}
        </span>
      }
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    :host:empty {
      display: none;
    }

    .vote {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      min-height: 2rem;
      padding: 0 0.6rem;
      border: 1px solid var(--ion-color-medium-tint);
      border-radius: var(--border-radius);
      background: none;
      color: var(--ion-color-medium-shade);
      font: inherit;
      font-size: 0.8rem;
    }

    button.vote {
      cursor: pointer;
    }

    span.vote {
      border-color: transparent;
      padding: 0 0.25rem;
    }

    .vote-own {
      border-color: var(--ion-color-success);
      background: rgba(var(--ion-color-success-rgb), 0.12);
      color: var(--ion-color-success-shade);
    }

    .vote-own.vote-dispute {
      border-color: var(--ion-color-danger);
      background: rgba(var(--ion-color-danger-rgb), 0.12);
      color: var(--ion-color-danger-shade);
    }
  `,
})
export class DietaryVoteButtonsComponent {
  label = input.required<DietaryLabel>();

  tally = input<DietaryLabelTally | undefined>();

  ownVote = input<DietaryVote | undefined>();

  /** Whether the viewer is offered a vote; otherwise the counts alone. */
  canVote = input(false);

  /** The viewer tapped confirm or dispute. */
  readonly voteClick = output<DietaryVote>();

  protected readonly votes: readonly DietaryVote[] = ['confirm', 'dispute'];

  protected readonly hasVotes = computed(
    () => (this.tally()?.confirm ?? 0) + (this.tally()?.dispute ?? 0) > 0,
  );

  constructor() {
    addIcons({ thumbsUpOutline, thumbsDownOutline });
  }

  protected countOf(vote: DietaryVote): number {
    return this.tally()?.[vote] ?? 0;
  }

  protected countKeyOf(vote: DietaryVote): string {
    return vote === 'confirm'
      ? 'dietary-votes-confirmed'
      : 'dietary-votes-disputed';
  }

  protected iconOf(vote: DietaryVote): string {
    return vote === 'confirm' ? 'thumbs-up-outline' : 'thumbs-down-outline';
  }
}
