import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonNote } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChipComponent } from 'common/ui/chip';
import {
  DIETARY_LABELS,
  dietaryLabelsOf,
  needsConfirmWithRestaurantNotice,
  type DietaryLabel,
} from 'model';

/**
 * The dietary labels field of the Bite form (GitHub issue #2195): one chip per
 * label of the fixed vocabulary, tapped on and off. Separate from the
 * free-text tags, which stay as typed.
 *
 * Optional and local: it needs nothing from the network and validates
 * nothing, so it never stands between the creator and Post, offline
 * included (`RD-QG-1`). What the creator picks is shown as their claim, which
 * the hint says before they pick.
 */
@Component({
  selector: 'bt-dietary-label-picker',
  templateUrl: './dietary-label-picker.component.html',
  styleUrl: './dietary-label-picker.component.scss',
  imports: [IonNote, TranslocoPipe, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DietaryLabelPickerComponent {
  selected = input<readonly DietaryLabel[]>([]);

  selectedChange = output<DietaryLabel[]>();

  readonly labels = DIETARY_LABELS;

  private readonly known = computed(() => dietaryLabelsOf(this.selected()));

  /** The notice is shown while a high-risk label is picked (`R-4`). */
  readonly showsNotice = computed(() =>
    needsConfirmWithRestaurantNotice(this.known()),
  );

  isSelected(label: DietaryLabel): boolean {
    return this.known().includes(label);
  }

  toggle(label: DietaryLabel): void {
    const current = this.known();

    // Through `dietaryLabelsOf` so the stored list keeps vocabulary order.
    this.selectedChange.emit(
      dietaryLabelsOf(
        current.includes(label)
          ? current.filter((picked) => picked !== label)
          : [...current, label],
      ),
    );
  }
}
