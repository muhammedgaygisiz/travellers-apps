import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { DietaryLabelVotesComponent } from 'bite-tribe/dietary-vote';
import {
  creatorLabelsBySource,
  dietaryLabelClass,
  dietaryLabelsOf,
  needsConfirmWithRestaurantNotice,
  type DietaryLabel,
  type DietaryLabelTallies,
  type DietaryLabelTally,
  type DietaryOwnVotes,
  type DietaryVote,
} from 'model';

/**
 * The dietary labels on a Bite's detail page (GitHub issue #2195), one group
 * per source, and each group names it: what the creator says, and what the
 * restaurant declares for the linked dish. Neither replaces the other - a
 * label both claim is shown in both - because the reader judges a claim by
 * who makes it (`RD-DC-1`).
 *
 * A high-risk label whose only source is the creator carries the fixed
 * notice to confirm with the restaurant (`R-4`, `RD-DC-5`). The restaurant's
 * own declaration does not.
 *
 * Diners confirm or dispute the creator's labels (GitHub issue #2197). A
 * label with enough confirmations and no dispute moves out of the creator's
 * group into one reported by diners, and a high-risk one there still carries
 * the notice, whatever its count. Every label shows its counts, and a viewer
 * offered a vote taps a label to cast one.
 *
 * Renders nothing when neither source has a label (`Absent Field Contract`).
 */
@Component({
  selector: 'bt-bite-dietary',
  templateUrl: './bite-dietary.component.html',
  styleUrl: './bite-dietary.component.scss',
  imports: [DietaryLabelVotesComponent, NgTemplateOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteDietaryComponent {
  /** The Bite's own `dietaryLabels`, as stored. */
  creatorLabels = input<unknown>();

  /** What the restaurant declares for the linked dish. */
  restaurantLabels = input<readonly DietaryLabel[]>([]);

  restaurantOptions = input<readonly DietaryLabel[]>([]);

  /** What diners said about the creator's labels (issue #2197). */
  tallies = input<DietaryLabelTallies>({});

  /** The viewer's own votes on them. */
  ownVotes = input<DietaryOwnVotes>({});

  /** Whether the viewer is offered a vote on the creator's labels. */
  canVote = input(false);

  /** The viewer tapped a label to confirm or dispute it. */
  readonly voteClick = output<DietaryLabel>();

  protected readonly restaurant = computed(() =>
    dietaryLabelsOf(this.restaurantLabels()),
  );

  private readonly bySource = computed(() =>
    creatorLabelsBySource(
      this.creatorLabels(),
      this.tallies(),
      this.restaurant(),
    ),
  );

  /** The creator's labels diners have reported, as reported by diners. */
  protected readonly reported = computed(() => this.bySource().reported);

  /** The creator's labels that are still only their claim. */
  protected readonly creator = computed(() => this.bySource().creator);

  /**
   * Diners' high-risk labels the restaurant does not declare carry the
   * notice however many diners confirm them (`R-4`).
   */
  protected readonly showsDinersNotice = computed(() =>
    needsConfirmWithRestaurantNotice(
      this.reported().filter((label) => !this.restaurant().includes(label)),
    ),
  );

  protected readonly options = computed(() =>
    dietaryLabelsOf(this.restaurantOptions()).filter(
      (option) => !this.restaurant().includes(option),
    ),
  );

  protected readonly hasRestaurant = computed(
    () => this.restaurant().length > 0 || this.options().length > 0,
  );

  /**
   * The creator's high-risk labels the restaurant does not also declare: for
   * those the creator is the only source, so they get the notice.
   */
  protected readonly showsNotice = computed(() =>
    needsConfirmWithRestaurantNotice(
      this.creator().filter((label) => !this.restaurant().includes(label)),
    ),
  );

  protected tallyOf(label: DietaryLabel): DietaryLabelTally | undefined {
    return this.tallies()[label];
  }

  protected ownVoteOf(label: DietaryLabel): DietaryVote | undefined {
    return this.ownVotes()[label];
  }

  protected isHighRisk(label: DietaryLabel): boolean {
    return dietaryLabelClass(label) === 'high-risk';
  }
}
