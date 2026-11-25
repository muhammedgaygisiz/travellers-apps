import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  dietaryLabelClass,
  dietaryLabelsOf,
  needsConfirmWithRestaurantNotice,
  type DietaryLabel,
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
 * Renders nothing when neither source has a label (`Absent Field Contract`).
 */
@Component({
  selector: 'bt-bite-dietary',
  templateUrl: './bite-dietary.component.html',
  styleUrl: './bite-dietary.component.scss',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteDietaryComponent {
  /** The Bite's own `dietaryLabels`, as stored. */
  creatorLabels = input<unknown>();

  /** What the restaurant declares for the linked dish. */
  restaurantLabels = input<readonly DietaryLabel[]>([]);

  restaurantOptions = input<readonly DietaryLabel[]>([]);

  protected readonly creator = computed(() =>
    dietaryLabelsOf(this.creatorLabels()),
  );

  protected readonly restaurant = computed(() =>
    dietaryLabelsOf(this.restaurantLabels()),
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

  protected isHighRisk(label: DietaryLabel): boolean {
    return dietaryLabelClass(label) === 'high-risk';
  }
}
