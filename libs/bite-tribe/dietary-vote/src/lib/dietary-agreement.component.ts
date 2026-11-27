import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { DietaryLabelTally, DietaryVote } from 'model';

/**
 * How diners split on one of a dish's dietary labels on the menu (GitHub
 * issue #2197): one line saying how many of them agree, a bar beneath it, green for those who confirm and red for those
 * who dispute. The number is always written out, because a bar alone reads
 * the same for one vote as for fifty. The reader's own vote, if any, goes
 * on a line of its own under the bar.
 *
 * A label nobody voted on renders nothing, so the row looks as it did.
 */
@Component({
  selector: 'bt-dietary-agreement',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total()) {
      <span class="agreement-text" data-testid="dietary-agreement-text">
        {{
          'dietary-votes-agreeing'
            | transloco: { agree: confirmed(), total: total() }
        }}
      </span>
      <span class="agreement-bar" aria-hidden="true">
        <span
          class="agreement-confirm"
          data-testid="dietary-agreement-confirm"
          [style.width.%]="confirmedShare()"
        ></span>
        <span class="agreement-dispute"></span>
      </span>
      @if (ownVote(); as vote) {
        <span class="agreement-own" data-testid="dietary-agreement-own">
          {{ 'dietary-vote-own-' + vote | transloco }}
        </span>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    :host:empty {
      display: none;
    }

    .agreement-text,
    .agreement-own {
      color: var(--ion-color-medium-shade);
      font-size: 0.75rem;
    }

    .agreement-bar {
      display: flex;
      height: 0.3rem;
      border-radius: 0.15rem;
      overflow: hidden;
    }

    .agreement-confirm {
      background: var(--ion-color-success);
    }

    .agreement-dispute {
      flex: 1;
      background: var(--ion-color-danger);
    }
  `,
})
export class DietaryAgreementComponent {
  tally = input<DietaryLabelTally | undefined>();

  ownVote = input<DietaryVote | undefined>();

  protected readonly confirmed = computed(() => this.tally()?.confirm ?? 0);

  protected readonly total = computed(
    () => this.confirmed() + (this.tally()?.dispute ?? 0),
  );

  protected readonly confirmedShare = computed(() =>
    Math.round((this.confirmed() / this.total()) * 100),
  );
}
